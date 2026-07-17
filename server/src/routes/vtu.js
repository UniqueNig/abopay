import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { vtpassPay, vtpassVariations, vtpassMerchantVerify, lookupService } from "../services/vtpass.js";
import { debitWallet, creditWallet } from "../services/wallet.js";
import { verifyTransactionPin } from "../services/pin.js";
import { getSettings, assertNotMaintenance, assertServiceEnabled } from "../services/settings.js";
import { previewCoupon, recordRedemption } from "../services/coupons.js";
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
router.get("/data-plans/:network", requireAuth, async (req, res, next) => {
  try {
    const serviceID = lookupService("data", req.params.network.toLowerCase());
    if (!serviceID) throw new ApiError(400, `Unknown network: ${req.params.network}`);
    res.json(await vtpassVariations(serviceID));
  } catch (err) {
    next(err);
  }
});

// Same idea for cable bouquets — Bills.jsx currently sends variationCode: "",
// which VTpass will reject the same way it rejected the guessed data codes.
router.get("/cable-plans/:provider", requireAuth, async (req, res, next) => {
  try {
    const serviceID = lookupService("cable", req.params.provider);
    if (!serviceID) throw new ApiError(400, `Unknown cable provider: ${req.params.provider}`);
    res.json(await vtpassVariations(serviceID));
  } catch (err) {
    next(err);
  }
});

// Confirms the smartcard belongs to a real active subscription and returns
// the customer's name, so the frontend can show "Paying for: X" before the
// user confirms — same trust pattern as the bank-transfer name resolution.
router.get("/verify-cable/:provider/:smartCardNumber", requireAuth, async (req, res, next) => {
  try {
    const serviceID = lookupService("cable", req.params.provider);
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
    COUPON_RULE,
    PIN_RULE,
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { network, phone, amount, couponCode, pin } = req.body;
      const serviceID = lookupService("airtime", network.toLowerCase());
      if (!serviceID) throw new ApiError(400, `Unknown network: ${network}`);

      const settings = await getSettings();
      assertNotMaintenance(settings);
      assertServiceEnabled(settings, "airtime");

      const markup = amount * (settings.pricing.airtimeDiscountPercent / 100);
      const couponResult = await previewCoupon(couponCode, req.uid, markup);
      const discount = couponResult?.discount || 0;
      const chargeAmount = amount + markup - discount;

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
        { network, phone, amount, fee: markup, couponCode: couponResult ? couponResult.coupon.code : null, couponDiscount: discount },
        () => vtpassPay({ request_id: requestId, serviceID, amount, phone, billersCode: phone, quantity: 1 })
      );

      const txStatus = vtpassRes?.content?.transactions?.status;
      await Transaction.updateOne(
        { reference: ref },
        { $set: { "meta.vtpassTxId": vtpassRes?.content?.transactions?.transactionId, "meta.deliveryStatus": txStatus } }
      );

      if (couponResult) await recordRedemption(couponResult.coupon._id, req.uid, ref);

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
    body("amount").isFloat({ gt: 0 }),
    COUPON_RULE,
    PIN_RULE,
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { network, phone, variationCode, amount, couponCode, pin } = req.body;
      const serviceID = lookupService("data", network.toLowerCase());
      if (!serviceID) throw new ApiError(400, `Unknown network: ${network}`);

      const settings = await getSettings();
      assertNotMaintenance(settings);
      assertServiceEnabled(settings, "data");

      const markup = amount * (settings.pricing.dataDiscountPercent / 100);
      const couponResult = await previewCoupon(couponCode, req.uid, markup);
      const discount = couponResult?.discount || 0;
      const chargeAmount = amount + markup - discount;

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
        { network, phone, variationCode, amount, fee: markup, couponCode: couponResult ? couponResult.coupon.code : null, couponDiscount: discount },
        () => vtpassPay({ request_id: requestId, serviceID, billersCode: phone, variation_code: variationCode, amount, phone, quantity: 1 })
      );

      const txStatus = vtpassRes?.content?.transactions?.status;
      await Transaction.updateOne(
        { reference: ref },
        { $set: { "meta.vtpassTxId": vtpassRes?.content?.transactions?.transactionId, "meta.deliveryStatus": txStatus } }
      );

      if (couponResult) await recordRedemption(couponResult.coupon._id, req.uid, ref);

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
    body("amount").isFloat({ gt: 0 }),
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

      const fee = settings.pricing.billFeeFlat;
      const couponResult = await previewCoupon(couponCode, req.uid, fee);
      const discount = couponResult?.discount || 0;
      const chargeAmount = amount + fee - discount;

      await requireBalanceAndPin(req.uid, chargeAmount, pin);

      let serviceID, billersCode, payloadExtra = {};
      if (billType === "electricity") {
        serviceID = lookupService("electricity", provider);
        if (!serviceID) throw new ApiError(400, `Unknown electricity provider: ${provider}`);
        billersCode = meterNumber;
        payloadExtra = { variation_code: meterType || "prepaid" };
      } else {
        serviceID = lookupService("cable", provider);
        if (!serviceID) throw new ApiError(400, `Unknown cable provider: ${provider}`);
        billersCode = smartCardNumber || meterNumber;
        payloadExtra = { variation_code: variationCode || "" };
      }

      const requestId = Date.now().toString();
      const category = billType === "electricity" ? "⚡" : "📺";
      const ref = "BILL-" + requestId;

      const vtpassRes = await debitThenPurchase(
        req.uid,
        chargeAmount,
        ref,
        `${provider} ${billType}`,
        category,
        {
          provider, billType, billersCode, accountName: accountName || null,
          amount, fee, couponCode: couponResult ? couponResult.coupon.code : null, couponDiscount: discount,
        },
        () =>
          vtpassPay(
            { request_id: requestId, serviceID, billersCode, amount, phone, quantity: 1, ...payloadExtra },
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
