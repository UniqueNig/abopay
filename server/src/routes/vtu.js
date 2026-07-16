import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { VTPASS_SERVICE, vtpassPay, vtpassVariations, vtpassMerchantVerify } from "../services/vtpass.js";
import { debitWallet } from "../services/wallet.js";
import { User } from "../models/User.js";

const router = Router();

async function requireBalance(uid, amount) {
  const user = await User.findOne({ uid });
  if (!user) throw new ApiError(404, "User not found.");
  if (user.suspended) throw new ApiError(403, "This account has been suspended.");
  if (user.balance < amount) throw new ApiError(400, "Insufficient balance.");
  return user;
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
    const serviceID = VTPASS_SERVICE.data[req.params.network.toLowerCase()];
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
    const serviceID = VTPASS_SERVICE.cable[req.params.provider];
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
    const serviceID = VTPASS_SERVICE.cable[req.params.provider];
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

router.post(
  "/airtime",
  requireAuth,
  [
    body("network").isString().trim().notEmpty(),
    body("phone").isString().trim().isLength({ min: 10, max: 11 }),
    body("amount").isFloat({ gt: 0 }),
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { network, phone, amount } = req.body;
      const serviceID = VTPASS_SERVICE.airtime[network.toLowerCase()];
      if (!serviceID) throw new ApiError(400, `Unknown network: ${network}`);

      await requireBalance(req.uid, amount);

      const requestId = Date.now().toString();
      const vtpassRes = await vtpassPay({
        request_id: requestId,
        serviceID,
        amount,
        phone,
        billersCode: phone,
        quantity: 1,
      });

      const txStatus = vtpassRes?.content?.transactions?.status;
      const ref = "AIR-" + requestId;
      await debitWallet(req.uid, amount, ref, `${network.toUpperCase()} Airtime – ${phone}`, "📱", {
        network,
        phone,
        vtpassTxId: vtpassRes?.content?.transactions?.transactionId,
        deliveryStatus: txStatus,
      });

      res.json({ success: true, status: txStatus, requestId, reference: ref });
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
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { network, phone, variationCode, amount } = req.body;
      const serviceID = VTPASS_SERVICE.data[network.toLowerCase()];
      if (!serviceID) throw new ApiError(400, `Unknown network: ${network}`);

      await requireBalance(req.uid, amount);

      const requestId = Date.now().toString();
      const vtpassRes = await vtpassPay({
        request_id: requestId,
        serviceID,
        billersCode: phone,
        variation_code: variationCode,
        amount,
        phone,
        quantity: 1,
      });

      const txStatus = vtpassRes?.content?.transactions?.status;
      const ref = "DATA-" + requestId;
      await debitWallet(req.uid, amount, ref, `${network.toUpperCase()} Data – ${phone}`, "📶", {
        network,
        phone,
        variationCode,
        vtpassTxId: vtpassRes?.content?.transactions?.transactionId,
        deliveryStatus: txStatus,
      });

      res.json({ success: true, status: txStatus, requestId, reference: ref });
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
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { billType, provider, meterNumber, smartCardNumber, amount, meterType, variationCode, phone } = req.body;

      await requireBalance(req.uid, amount);

      let serviceID, billersCode, payloadExtra = {};
      if (billType === "electricity") {
        serviceID = VTPASS_SERVICE.electricity[provider];
        if (!serviceID) throw new ApiError(400, `Unknown electricity provider: ${provider}`);
        billersCode = meterNumber;
        payloadExtra = { variation_code: meterType || "prepaid" };
      } else {
        serviceID = VTPASS_SERVICE.cable[provider];
        if (!serviceID) throw new ApiError(400, `Unknown cable provider: ${provider}`);
        billersCode = smartCardNumber || meterNumber;
        payloadExtra = { variation_code: variationCode || "" };
      }

      const requestId = Date.now().toString();
      const vtpassRes = await vtpassPay(
        {
          request_id: requestId,
          serviceID,
          billersCode,
          amount,
          phone,
          quantity: 1,
          ...payloadExtra,
        },
        30000
      );

      const txStatus = vtpassRes?.content?.transactions?.status;
      const electricityToken = vtpassRes?.purchased_code || null;
      const category = billType === "electricity" ? "⚡" : "📺";
      const ref = "BILL-" + requestId;

      await debitWallet(req.uid, amount, ref, `${provider} ${billType}`, category, {
        provider,
        billType,
        billersCode,
        vtpassTxId: vtpassRes?.content?.transactions?.transactionId,
        deliveryStatus: txStatus,
        electricityToken,
      });

      res.json({ success: true, status: txStatus, requestId, reference: ref, electricityToken });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
