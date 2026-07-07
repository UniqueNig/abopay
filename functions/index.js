/**
 * Abopay — Firebase Cloud Functions
 *
 * 1. verifyDeposit     — verify Paystack payment server-side, credit wallet
 * 2. paystackWebhook   — handle async Paystack events (bank transfer, USSD, refunds)
 * 3. initiateTransfer  — real bank transfer via Paystack Transfers API
 * 4. purchaseAirtime   — deliver airtime via VTpass after debiting wallet
 * 5. purchaseData      — deliver data bundle via VTpass after debiting wallet
 * 6. payBill           — pay electricity/cable/water/internet via VTpass
 */

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// ── Paystack secrets — still managed via Secret Manager ─────────────────────
const PAYSTACK_SECRET         = defineSecret("PAYSTACK_SECRET_KEY");
const PAYSTACK_WEBHOOK_SECRET = defineSecret("PAYSTACK_WEBHOOK_SECRET");

// ── VTpass keys — embedded directly (sandbox mode for testing) ───────────────
// Switch VTPASS_BASE to the production URL and update these to live keys when ready.
const _VTPASS_API_KEY    = "ed3f3f56cf23ce84381efd283dad0ab1";
const _VTPASS_PUBLIC_KEY = "PK_583aa9f3886286c7b0e1cbe4f4b8c6355216fdb7c9b";
const _VTPASS_SECRET_KEY = "SK_47203aa441c8d2b93c897b45b6f293844e54ccb661b";

// VTpass base URLs — currently pointing at SANDBOX for safe testing
const VTPASS_BASE = "https://sandbox.vtpass.com/api"; // ← switch to https://vtpass.com/api for production
const VTPASS_SAND = "https://sandbox.vtpass.com/api";

// VTpass service IDs
const VTPASS_SERVICE = {
  airtime: { mtn: "mtn", airtel: "airtel", glo: "glo", "9mobile": "etisalat" },
  data:    { mtn: "mtn-data", airtel: "airtel-data", glo: "glo-data", "9mobile": "etisalat-data" },
  electricity: {
    "EKEDC":  "eko-electric",
    "IKEDC":  "ikeja-electric",
    "AEDC":   "abuja-electric",
    "PHEDC":  "phed",
    "BEDC":   "benin-electric",
    "EEDC":   "enugu-electric",
    "KEDCO":  "kaduna-electric",
    "JED":    "jos-electric",
  },
  cable: { "DSTV": "dstv", "GOtv": "gotv", "StarTimes": "startimes" },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function creditWallet(uid, amount, reference, title = "Wallet Deposit", category = "💳", meta = {}) {
  const userRef = db.collection("users").doc(uid);
  await db.runTransaction(async (t) => {
    const snap = await t.get(userRef);
    if (!snap.exists) throw new Error("User not found");
    const data = snap.data();
    const existing = data.transactions || [];
    if (existing.some((tx) => tx.reference === reference)) return; // idempotent
    const newTx = { id: reference, type: "credit", title, amount, date: new Date().toISOString(), category, reference, ...meta };
    t.update(userRef, { balance: (data.balance || 0) + amount, transactions: [newTx, ...existing].slice(0, 200) });
  });
}

async function debitWallet(uid, amount, reference, title, category = "💸", meta = {}) {
  const userRef = db.collection("users").doc(uid);
  await db.runTransaction(async (t) => {
    const snap = await t.get(userRef);
    if (!snap.exists) throw new Error("User not found");
    const data = snap.data();
    const existing = data.transactions || [];
    if (existing.some((tx) => tx.reference === reference)) return; // idempotent
    if ((data.balance || 0) < amount) throw new Error("Insufficient balance");
    const newTx = { id: reference, type: "debit", title, amount, date: new Date().toISOString(), category, reference, ...meta };
    t.update(userRef, { balance: data.balance - amount, transactions: [newTx, ...existing].slice(0, 200) });
  });
}

function vtpassHeaders(apiKey, pubKey, secKey) {
  // VTpass requires both Basic auth (username:password encoded) AND API key header
  const credentials = Buffer.from(`${pubKey}:${secKey}`).toString("base64");
  return {
    "api-key": apiKey,
    "public-key": pubKey,
    "Authorization": `Basic ${credentials}`,
    "Content-Type": "application/json",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. verifyDeposit
//    Frontend calls after Paystack onSuccess. Verifies server-side then credits.
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyDeposit = onCall(
  { secrets: [PAYSTACK_SECRET], region: "us-central1" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
    const { reference } = request.data;
    if (!reference) throw new HttpsError("invalid-argument", "reference is required.");

    let paystackData;
    try {
      const res = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET.value()}` }, timeout: 10000 }
      );
      paystackData = res.data;
    } catch (err) {
      console.error("Paystack verify error:", err.response?.data || err.message);
      throw new HttpsError("unavailable", "Could not verify payment. Try again.");
    }

    if (!paystackData.status || paystackData.data?.status !== "success")
      throw new HttpsError("failed-precondition", "Payment not confirmed by Paystack.");

    const tx = paystackData.data;
    const amountNaira = tx.amount / 100;
    const uid = request.auth.uid;

    // Verify the email matches the logged-in user
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) throw new HttpsError("not-found", "User record not found.");
    if (userSnap.data().email !== tx.customer?.email)
      throw new HttpsError("permission-denied", "Payment email does not match account.");

    await creditWallet(uid, amountNaira, reference, "Wallet Deposit", "💳", {
      channel: tx.channel, paidAt: tx.paid_at,
    });

    return { success: true, amount: amountNaira };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. paystackWebhook
//    Paystack POSTs here for async events. Set URL in Paystack Dashboard.
//    URL: https://us-central1-abopay-53bc4.cloudfunctions.net/paystackWebhook
// ─────────────────────────────────────────────────────────────────────────────
exports.paystackWebhook = onRequest(
  { secrets: [PAYSTACK_WEBHOOK_SECRET], region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

    // Validate Paystack signature
    const signature = req.headers["x-paystack-signature"];
    const expected = crypto.createHmac("sha512", PAYSTACK_WEBHOOK_SECRET.value())
      .update(JSON.stringify(req.body)).digest("hex");
    if (signature !== expected) { console.warn("Invalid webhook signature"); res.status(401).send("Unauthorized"); return; }

    const event = req.body;
    console.log("Webhook event:", event.event);

    try {
      if (event.event === "charge.success") {
        const tx = event.data;
        const customerEmail = tx.customer?.email;
        if (!customerEmail) { res.status(200).send("ok"); return; }

        const usersSnap = await db.collection("users").where("email", "==", customerEmail).limit(1).get();
        if (usersSnap.empty) { res.status(200).send("ok"); return; }

        const uid = usersSnap.docs[0].id;
        const customFields = tx.metadata?.custom_fields || [];
        const txType = customFields.find((f) => f.variable_name === "type")?.value || "wallet_deposit";

        if (txType === "wallet_deposit") {
          await creditWallet(uid, tx.amount / 100, tx.reference, "Wallet Deposit", "💳", {
            channel: tx.channel, paidAt: tx.paid_at,
          });
        }
      }

      if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
        const tx = event.data;
        const pendingSnap = await db.collection("pendingTransfers")
          .where("transferReference", "==", tx.reference).limit(1).get();
        if (!pendingSnap.empty) {
          const pending = pendingSnap.docs[0].data();
          await creditWallet(pending.uid, tx.amount / 100, tx.reference + "_refund",
            "Transfer Refund", "↩️", { reason: event.event });
          await pendingSnap.docs[0].ref.delete();
        }
      }
    } catch (err) {
      console.error("Webhook error:", err);
    }

    res.status(200).send("ok");
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. initiateTransfer — real bank transfer via Paystack Transfers API
// ─────────────────────────────────────────────────────────────────────────────
exports.initiateTransfer = onCall(
  { secrets: [PAYSTACK_SECRET], region: "us-central1" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

    const { accountNumber, bankCode, accountName, amount, narration } = request.data;
    if (!accountNumber || !bankCode || !accountName || !amount)
      throw new HttpsError("invalid-argument", "accountNumber, bankCode, accountName, and amount required.");

    const uid = request.auth.uid;
    const headers = { Authorization: `Bearer ${PAYSTACK_SECRET.value()}`, "Content-Type": "application/json" };

    // Check server-side balance
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) throw new HttpsError("not-found", "User not found.");
    if ((userSnap.data().balance || 0) < amount)
      throw new HttpsError("failed-precondition", "Insufficient balance.");

    // Create transfer recipient
    let recipientCode;
    try {
      const recipientRes = await axios.post("https://api.paystack.co/transferrecipient",
        { type: "nuban", name: accountName, account_number: accountNumber, bank_code: bankCode, currency: "NGN" },
        { headers, timeout: 10000 });
      recipientCode = recipientRes.data.data.recipient_code;
    } catch (err) {
      console.error("Create recipient error:", err.response?.data || err.message);
      throw new HttpsError("unavailable", "Could not verify account. Check details and try again.");
    }

    // Initiate transfer
    const transferRef = "TRF-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
    let transferData;
    try {
      const transferRes = await axios.post("https://api.paystack.co/transfer",
        { source: "balance", amount: Math.round(amount * 100), recipient: recipientCode,
          reason: narration || "Abopay Transfer", reference: transferRef },
        { headers, timeout: 10000 });
      transferData = transferRes.data.data;
    } catch (err) {
      console.error("Transfer error:", err.response?.data || err.message);
      throw new HttpsError("unavailable", "Transfer failed. Try again.");
    }

    // Debit wallet after Paystack accepts
    await debitWallet(uid, amount, transferRef, `Transfer to ${accountNumber}`, "↗️",
      { bank: bankCode, accountName, narration: narration || "Transfer", transferStatus: transferData.status, recipientCode });

    // Save pending so webhook can refund if it fails
    await db.collection("pendingTransfers").doc(transferRef).set({
      uid, amount, accountNumber, bankCode, accountName,
      narration: narration || "Transfer", transferReference: transferRef,
      recipientCode, status: transferData.status, createdAt: new Date().toISOString(),
    });

    return { success: true, status: transferData.status, reference: transferRef };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. purchaseAirtime
//    Debit wallet then call VTpass to deliver airtime instantly.
//    Frontend: httpsCallable(functions, "purchaseAirtime")
//    Payload:  { network: "mtn"|"airtel"|"glo"|"9mobile", phone: "080...", amount: 500 }
// ─────────────────────────────────────────────────────────────────────────────
exports.purchaseAirtime = onCall(
  { secrets: [], region: "us-central1" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

    const { network, phone, amount } = request.data;
    if (!network || !phone || !amount)
      throw new HttpsError("invalid-argument", "network, phone, and amount are required.");

    const uid = request.auth.uid;
    const serviceID = VTPASS_SERVICE.airtime[network.toLowerCase()];
    if (!serviceID) throw new HttpsError("invalid-argument", `Unknown network: ${network}`);

    // Check balance server-side
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) throw new HttpsError("not-found", "User not found.");
    if ((userSnap.data().balance || 0) < amount)
      throw new HttpsError("failed-precondition", "Insufficient balance.");

    const requestId = Date.now().toString();
    const headers = vtpassHeaders(_VTPASS_API_KEY, _VTPASS_PUBLIC_KEY, _VTPASS_SECRET_KEY);

    // Call VTpass
    let vtpassRes;
    try {
      const res = await axios.post(`${VTPASS_BASE}/pay`, {
        request_id: requestId,
        serviceID,
        amount,
        phone,
        billersCode: phone,
        quantity: 1,
      }, { headers, timeout: 15000 });
      vtpassRes = res.data;
    } catch (err) {
      console.error("VTpass airtime error:", err.response?.data || err.message);
      throw new HttpsError("unavailable", "Could not deliver airtime. No charge made.");
    }

    // VTpass code "000" = success, "099" = processing (treat as ok)
    const txStatus = vtpassRes?.content?.transactions?.status;
    const code = vtpassRes?.code;
    if (code !== "000" && code !== "099") {
      console.error("VTpass returned non-success:", vtpassRes);
      throw new HttpsError("unavailable", `Airtime delivery failed: ${vtpassRes?.response_description || "Unknown error"}`);
    }

    // Debit wallet only after VTpass succeeds
    const ref = "AIR-" + requestId;
    await debitWallet(uid, amount, ref, `${network.toUpperCase()} Airtime – ${phone}`, "📱",
      { network, phone, vtpassTxId: vtpassRes?.content?.transactions?.transactionId, deliveryStatus: txStatus });

    return { success: true, status: txStatus, requestId, reference: ref };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. purchaseData
//    Debit wallet then call VTpass to activate a data bundle.
//    Payload: { network: "mtn", phone: "080...", variationCode: "mtn-10gb-30days", amount: 3000 }
//    Get variationCodes first from: GET /service-variations?serviceID=mtn-data
// ─────────────────────────────────────────────────────────────────────────────
exports.purchaseData = onCall(
  { secrets: [], region: "us-central1" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

    const { network, phone, variationCode, amount } = request.data;
    if (!network || !phone || !variationCode || !amount)
      throw new HttpsError("invalid-argument", "network, phone, variationCode, and amount are required.");

    const uid = request.auth.uid;
    const serviceID = VTPASS_SERVICE.data[network.toLowerCase()];
    if (!serviceID) throw new HttpsError("invalid-argument", `Unknown network: ${network}`);

    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) throw new HttpsError("not-found", "User not found.");
    if ((userSnap.data().balance || 0) < amount)
      throw new HttpsError("failed-precondition", "Insufficient balance.");

    const requestId = Date.now().toString();
    const headers = vtpassHeaders(_VTPASS_API_KEY, _VTPASS_PUBLIC_KEY, _VTPASS_SECRET_KEY);

    let vtpassRes;
    try {
      const res = await axios.post(`${VTPASS_BASE}/pay`, {
        request_id: requestId,
        serviceID,
        billersCode: phone,
        variation_code: variationCode,
        amount,
        phone,
        quantity: 1,
      }, { headers, timeout: 15000 });
      vtpassRes = res.data;
    } catch (err) {
      console.error("VTpass data error:", err.response?.data || err.message);
      throw new HttpsError("unavailable", "Could not activate data. No charge made.");
    }

    const code = vtpassRes?.code;
    const txStatus = vtpassRes?.content?.transactions?.status;
    if (code !== "000" && code !== "099") {
      console.error("VTpass data non-success:", vtpassRes);
      throw new HttpsError("unavailable", `Data activation failed: ${vtpassRes?.response_description || "Unknown error"}`);
    }

    const ref = "DATA-" + requestId;
    await debitWallet(uid, amount, ref, `${network.toUpperCase()} Data – ${phone}`, "📶",
      { network, phone, variationCode, vtpassTxId: vtpassRes?.content?.transactions?.transactionId, deliveryStatus: txStatus });

    return { success: true, status: txStatus, requestId, reference: ref };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. payBill
//    Debit wallet then call VTpass to pay electricity, cable TV, water, internet.
//    Payload (electricity): { billType: "electricity", provider: "EKEDC", meterNumber: "...", amount: 5000, meterType: "prepaid" }
//    Payload (cable):       { billType: "cable", provider: "DSTV", smartCardNumber: "...", variationCode: "dstv-compact" }
// ─────────────────────────────────────────────────────────────────────────────
exports.payBill = onCall(
  { secrets: [], region: "us-central1" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

    const { billType, provider, meterNumber, smartCardNumber, amount, meterType, variationCode } = request.data;
    if (!billType || !provider || !amount)
      throw new HttpsError("invalid-argument", "billType, provider, and amount are required.");

    const uid = request.auth.uid;
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) throw new HttpsError("not-found", "User not found.");
    if ((userSnap.data().balance || 0) < amount)
      throw new HttpsError("failed-precondition", "Insufficient balance.");

    const requestId = Date.now().toString();
    const headers = vtpassHeaders(_VTPASS_API_KEY, _VTPASS_PUBLIC_KEY, _VTPASS_SECRET_KEY);

    let serviceID, billersCode, payloadExtra = {};

    if (billType === "electricity") {
      serviceID = VTPASS_SERVICE.electricity[provider];
      if (!serviceID) throw new HttpsError("invalid-argument", `Unknown electricity provider: ${provider}`);
      billersCode = meterNumber;
      payloadExtra = { variation_code: meterType || "prepaid" };
    } else if (billType === "cable") {
      serviceID = VTPASS_SERVICE.cable[provider];
      if (!serviceID) throw new HttpsError("invalid-argument", `Unknown cable provider: ${provider}`);
      billersCode = smartCardNumber || meterNumber;
      payloadExtra = { variation_code: variationCode || "" };
    } else {
      throw new HttpsError("invalid-argument", `Unsupported billType: ${billType}`);
    }

    let vtpassRes;
    try {
      const res = await axios.post(`${VTPASS_BASE}/pay`, {
        request_id: requestId,
        serviceID,
        billersCode,
        amount,
        phone: userSnap.data().phone || "",
        quantity: 1,
        ...payloadExtra,
      }, { headers, timeout: 20000 });
      vtpassRes = res.data;
    } catch (err) {
      console.error("VTpass bill error:", err.response?.data || err.message);
      throw new HttpsError("unavailable", "Bill payment failed. No charge made.");
    }

    const code = vtpassRes?.code;
    const txStatus = vtpassRes?.content?.transactions?.status;
    // Electricity returns token in purchased_code
    const electricityToken = vtpassRes?.purchased_code || null;

    if (code !== "000" && code !== "099") {
      console.error("VTpass bill non-success:", vtpassRes);
      throw new HttpsError("unavailable", `Bill payment failed: ${vtpassRes?.response_description || "Unknown error"}`);
    }

    const category = billType === "electricity" ? "⚡" : billType === "cable" ? "📺" : "🌐";
    const ref = "BILL-" + requestId;
    await debitWallet(uid, amount, ref, `${provider} ${billType}`, category,
      { provider, billType, billersCode, vtpassTxId: vtpassRes?.content?.transactions?.transactionId,
        deliveryStatus: txStatus, electricityToken });

    return { success: true, status: txStatus, requestId, reference: ref, electricityToken };
  }
);
