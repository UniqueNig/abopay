import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { vtpassPay, vtpassMerchantVerify, lookupService } from "../services/vtpass.js";
import { debitWallet, creditWallet } from "../services/wallet.js";
import { verifyTransactionPin } from "../services/pin.js";
import { getSettings, assertNotMaintenance, assertServiceEnabled } from "../services/settings.js";
import { previewCoupon, recordRedemption } from "../services/coupons.js";
import { getAirtimeRate, resolvePlanPrice, listCatalog, getServiceIDs } from "../services/productPricing.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";

const router = Router();

const PIN_RULE = body("pin").isString().matches(/^\d{4}$/).withMessage("A valid 4-digit PIN is required.");
const COUPON_RULE = body("couponCode").optional().isString().trim();

// The balance check here is a fast-fail UX nicety only — it runs outside any
// transaction, so it can't be trusted against two concurrent requests. The
// real, atomic guard is debitWallet, which callers below now run BEFORE the
// VTpass purchase call (refunding if that call then fails) rather than
// after — see the comment at each call site for why that order matters.
// `chargeAmount` is the fee/markup-inclusive total actually charged, not the
// VTpass face value — callers compute that first from settings + coupon.
async function requireBalanceAndPin(uid, chargeAmount, pin) {
  const user = await User.findOne({ uid });
  if (!user) throw new ApiError(404, "User not found.");
  if (user.suspended) throw new ApiError(403, "This account has been suspended.");
  if (user.balance < chargeAmount) throw new ApiError(400, "Insufficient balance.");
  await verifyTransactionPin(uid, pin);
  return user;
}

// Debits atomically first (closing the double-spend race a post-purchase
// debit would leave open — see requireBalanceAndPin above), then attempts
// the VTpass purchase. On failure, refunds the debit and rethrows so the
// route's existing catch/next(err) handling is unchanged.
async function debitThenPurchase(uid, amount, ref, title, category, meta, purchase) {
  await debitWallet(uid, amount, ref, title, category, meta);
  try {
    return await purchase();
  } catch (err) {
    await creditWallet(uid, amount, ref + "_refund", `Refund: failed ${title}`, "↩️", {
      reason: "vtu_purchase_failed",
    });
    throw err;
  }
}

function checkValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0].msg });
    return false;
  }
  return true;
}

// Real VTpass plan codes — the frontend must call this before letting a user
// pick a data bundle, rather than guessing a variationCode like "mtn-1000".
// Returns the admin's configured selling price (via the product-pricing
// catalog), not VTpass's raw wholesale price — customers should see exactly
// what they'll be charged, not Abopay's cost. A network can now span more
// than one VTpass service (e.g. Glo's regular + SME data merged together),
// so this queries each and combines the results; inactive (admin-hidden)
// plans are filtered out before anything reaches the customer.
router.get("/data-plans/:network", requireAuth, async (req, res, next) => {
  try {
    const serviceIDs = await getServiceIDs("data", req.params.network.toLowerCase());
    if (serviceIDs.length === 0) throw new ApiError(400, `Unknown network: ${req.params.network}`);
    const rows = (await Promise.all(serviceIDs.map((id) => listCatalog("data", id)))).flat();
    res.json({
      content: {
        varations: rows.filter((r) => r.active).map((r) => ({
          variation_code: r.variationCode, name: r.label, variation_amount: String(r.sellingPrice), serviceID: r.serviceID,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Same idea for cable bouquets — same selling-price substitution and
// multi-service merge as data above.
router.get("/cable-plans/:provider", requireAuth, async (req, res, next) => {
  try {
    const serviceIDs = await getServiceIDs("cable", req.params.provider);
    if (serviceIDs.length === 0) throw new ApiError(400, `Unknown cable provider: ${req.params.provider}`);
    const rows = (await Promise.all(serviceIDs.map((id) => listCatalog("cable", id)))).flat();
    res.json({
      content: {
        varations: rows.filter((r) => r.active).map((r) => ({
          variation_code: r.variationCode, name: r.label, variation_amount: String(r.sellingPrice), serviceID: r.serviceID,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Confirms the smartcard belongs to a real active subscription and returns
// the customer's name, so the frontend can show "Paying for: X" before the
// user confirms — same trust pattern as the bank-transfer name resolution.
router.get("/verify-cable/:provider/:smartCardNumber", requireAuth, async (req, res, next) => {
  try {
    const [serviceID] = await getServiceIDs("cable", req.params.provider);
    if (!serviceID) throw new ApiError(400, `Unknown cable provider: ${req.params.provider}`);
    const content = await vtpassMerchantVerify({ billersCode: req.params.smartCardNumber, serviceID });
    res.json({
      customerName: content?.Customer_Name || null,
      status: content?.Status || null,
      dueDate: content?.Due_Date || null,
    });
  } catch (err) {
    next(err);
  }
});

// Same idea for electricity meters — needs an extra "type" param
// (prepaid/postpaid) that cable doesn't.
router.get("/verify-electricity/:provider/:meterNumber", requireAuth, async (req, res, next) => {
  try {
    const serviceID = lookupService("electricity", req.params.provider);
    if (!serviceID) throw new ApiError(400, `Unknown electricity provider: ${req.params.provider}`);
    const type = req.query.type === "postpaid" ? "postpaid" : "prepaid";
    const content = await vtpassMerchantVerify({ billersCode: req.params.meterNumber, serviceID, extra: { type } });
    res.json({
      customerName: content?.Customer_Name || null,
      address: content?.Address || content?.Customer_District || null,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/airtime",
  requireAuth,
  [
    body("network").isString().trim().notEmpty(),
    body("phone").isString().trim().isLength({ min: 10, max: 11 }),
    body("amount").isFloat({ gt: 0 }),
    PIN_RULE,
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { network, phone, amount, pin } = req.body;
      const serviceID = lookupService("airtime", network.toLowerCase());
      if (!serviceID) throw new ApiError(400, `Unknown network: ${network}`);

      const settings = await getSettings();
      assertNotMaintenance(settings);
      assertServiceEnabled(settings, "airtime");

      // VTpass sells airtime to resellers below face value — that wholesale
      // spread is the actual source of profit. Rates are configured per
      // network in the admin Pricing Catalog (services/productPricing.js),
      // as a percent of face value; an unconfigured network defaults to
      // 100/100 (sell at face value, zero recorded margin). No coupon
      // support — there's no safe way to cap a further stacked discount
      // without knowing VTpass's real wholesale rate for this account.
      const rate = await getAirtimeRate(serviceID);
      const buyingPrice = amount * (rate.buyingPrice / 100);
      const chargeAmount = amount * (rate.sellingPrice / 100);

      await requireBalanceAndPin(req.uid, chargeAmount, pin);

      const requestId = Date.now().toString();
      const ref = "AIR-" + requestId;
      const title = `${network.toUpperCase()} Airtime – ${phone}`;

      const vtpassRes = await debitThenPurchase(
        req.uid,
        chargeAmount,
        ref,
        title,
        "📱",
        { network, phone, amount, buyingPrice, sellingPrice: chargeAmount },
        () => vtpassPay({ request_id: requestId, serviceID, amount, phone, billersCode: phone, quantity: 1 })
      );

      const txStatus = vtpassRes?.content?.transactions?.status;
      await Transaction.updateOne(
        { reference: ref },
        { $set: { "meta.vtpassTxId": vtpassRes?.content?.transactions?.transactionId, "meta.deliveryStatus": txStatus } }
      );

      res.json({ success: true, status: txStatus, requestId, reference: ref, amountCharged: chargeAmount });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/data",
  requireAuth,
  [
    body("network").isString().trim().notEmpty(),
    body("phone").isString().trim().isLength({ min: 10, max: 11 }),
    body("variationCode").isString().trim().notEmpty(),
    // Which of the network's (possibly several, once an admin merges in an
    // extra service like Glo SME) VTpass services this plan belongs to —
    // optional, defaults to the network's single hardcoded service.
    body("serviceID").optional().isString().trim(),
    PIN_RULE,
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { network, phone, variationCode, pin } = req.body;
      const allowedServiceIDs = await getServiceIDs("data", network.toLowerCase());
      if (allowedServiceIDs.length === 0) throw new ApiError(400, `Unknown network: ${network}`);

      // Never trust an arbitrary client-supplied serviceID — only one
      // that's actually configured for this network is accepted. Falls back
      // to the first (the network's primary/hardcoded service) if omitted.
      const requestedServiceID = req.body.serviceID;
      const serviceID = requestedServiceID && allowedServiceIDs.includes(requestedServiceID)
        ? requestedServiceID
        : allowedServiceIDs[0];

      const settings = await getSettings();
      assertNotMaintenance(settings);
      assertServiceEnabled(settings, "data");

      // Authoritative price resolved server-side — a client-supplied amount
      // is never trusted here, since data bundles have a real fixed VTpass
      // price per variationCode (unlike airtime's free-typed amount).
      const priced = await resolvePlanPrice("data", serviceID, variationCode);
      const faceValue = priced.buyingPrice;
      const chargeAmount = priced.sellingPrice;

      await requireBalanceAndPin(req.uid, chargeAmount, pin);

      const requestId = Date.now().toString();
      const ref = "DATA-" + requestId;
      const title = `${network.toUpperCase()} Data – ${phone}`;

      const vtpassRes = await debitThenPurchase(
        req.uid,
        chargeAmount,
        ref,
        title,
        "📶",
        { network, phone, variationCode, buyingPrice: priced.buyingPrice, sellingPrice: priced.sellingPrice },
        () => vtpassPay({ request_id: requestId, serviceID, billersCode: phone, variation_code: variationCode, amount: faceValue, phone, quantity: 1 })
      );

      const txStatus = vtpassRes?.content?.transactions?.status;
      await Transaction.updateOne(
        { reference: ref },
        { $set: { "meta.vtpassTxId": vtpassRes?.content?.transactions?.transactionId, "meta.deliveryStatus": txStatus } }
      );

      res.json({ success: true, status: txStatus, requestId, reference: ref, amountCharged: chargeAmount });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/bill",
  requireAuth,
  [
    body("billType").isIn(["electricity", "cable"]),
    body("provider").isString().trim().notEmpty(),
    // Required for electricity (customer types any amount); ignored for
    // cable, which resolves its authoritative price server-side below.
    body("amount").optional().isFloat({ gt: 0 }),
    // VTpass requires phone as a mandatory /pay parameter for bills — don't
    // fall back to the user's profile phone, which may be blank (e.g. Google
    // sign-in never collects one) and isn't necessarily tied to this meter/card.
    body("phone").isString().trim().isLength({ min: 10, max: 11 }).withMessage("A valid phone number is required."),
    body("meterNumber").optional().isString().trim(),
    body("smartCardNumber").optional().isString().trim(),
    body("meterType").optional().isString().trim(),
    body("variationCode").optional().isString().trim(),
    // Purely informational — whatever name was shown during the verify step,
    // carried through so it shows on the transaction receipt. Not used for
    // fund routing (billersCode is what VTpass actually charges against), so
    // trusting the client here doesn't create a money-movement risk.
    body("accountName").optional().isString().trim(),
    // Which of the provider's (possibly several) VTpass services this
    // bouquet belongs to — optional, defaults to the provider's single
    // hardcoded service. Cable-only; electricity has no equivalent.
    body("serviceID").optional().isString().trim(),
    COUPON_RULE,
    PIN_RULE,
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { billType, provider, meterNumber, smartCardNumber, amount, meterType, variationCode, phone, accountName, couponCode, pin } = req.body;

      const settings = await getSettings();
      assertNotMaintenance(settings);
      assertServiceEnabled(settings, "bills");

      let serviceID, billersCode, payloadExtra = {};
      let faceValue, chargeAmount, couponResult = null, discount = 0, fee = 0, buyingPrice = null, sellingPrice = null;

      if (billType === "electricity") {
        serviceID = lookupService("electricity", provider);
        if (!serviceID) throw new ApiError(400, `Unknown electricity provider: ${provider}`);
        billersCode = meterNumber;
        payloadExtra = { variation_code: meterType || "prepaid" };

        // Electricity keeps the flat additive fee — arbitrary user-typed
        // amount, no fixed VTpass "plan" to catalog-price like data/cable.
        if (!(amount > 0)) throw new ApiError(400, "A valid amount is required.");
        faceValue = amount;
        fee = settings.pricing.billFeeFlat;
        couponResult = await previewCoupon(couponCode, req.uid, fee);
        discount = couponResult?.discount || 0;
        chargeAmount = faceValue + fee - discount;
      } else {
        const allowedServiceIDs = await getServiceIDs("cable", provider);
        if (allowedServiceIDs.length === 0) throw new ApiError(400, `Unknown cable provider: ${provider}`);
        // Never trust an arbitrary client-supplied serviceID — same pattern
        // as the /data route above.
        serviceID = req.body.serviceID && allowedServiceIDs.includes(req.body.serviceID)
          ? req.body.serviceID
          : allowedServiceIDs[0];
        billersCode = smartCardNumber || meterNumber;
        if (!variationCode) throw new ApiError(400, "A bouquet must be selected.");
        payloadExtra = { variation_code: variationCode };

        // Same catalog-based, tamper-proof pricing as data purchases —
        // never trusts a client-supplied amount. No coupon support, same
        // reasoning as data: no safe cap without knowing VTpass's real rate.
        const priced = await resolvePlanPrice("cable", serviceID, variationCode);
        faceValue = priced.buyingPrice;
        chargeAmount = priced.sellingPrice;
        buyingPrice = priced.buyingPrice;
        sellingPrice = priced.sellingPrice;
      }

      await requireBalanceAndPin(req.uid, chargeAmount, pin);

      const requestId = Date.now().toString();
      const category = billType === "electricity" ? "⚡" : "📺";
      const ref = "BILL-" + requestId;

      const meta = billType === "electricity"
        ? {
            provider, billType, billersCode, accountName: accountName || null,
            amount: faceValue, fee, couponCode: couponResult ? couponResult.coupon.code : null, couponDiscount: discount,
          }
        : { provider, billType, billersCode, accountName: accountName || null, buyingPrice, sellingPrice };

      const vtpassRes = await debitThenPurchase(
        req.uid,
        chargeAmount,
        ref,
        `${provider} ${billType}`,
        category,
        meta,
        () =>
          vtpassPay(
            { request_id: requestId, serviceID, billersCode, amount: faceValue, phone, quantity: 1, ...payloadExtra },
            30000
          )
      );

      const txStatus = vtpassRes?.content?.transactions?.status;
      const electricityToken = vtpassRes?.purchased_code || null;
      await Transaction.updateOne(
        { reference: ref },
        {
          $set: {
            "meta.vtpassTxId": vtpassRes?.content?.transactions?.transactionId,
            "meta.deliveryStatus": txStatus,
            "meta.electricityToken": electricityToken,
          },
        }
      );

      if (couponResult) await recordRedemption(couponResult.coupon._id, req.uid, ref);

      res.json({ success: true, status: txStatus, requestId, reference: ref, electricityToken, amountCharged: chargeAmount });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
