import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { VTPASS_SERVICE, vtpassPay } from "../services/vtpass.js";
import { debitWallet } from "../services/wallet.js";
import { User } from "../models/User.js";

const router = Router();

async function requireBalance(uid, amount) {
  const user = await User.findOne({ uid });
  if (!user) throw new ApiError(404, "User not found.");
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
    body("meterNumber").optional().isString().trim(),
    body("smartCardNumber").optional().isString().trim(),
    body("meterType").optional().isString().trim(),
    body("variationCode").optional().isString().trim(),
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { billType, provider, meterNumber, smartCardNumber, amount, meterType, variationCode } = req.body;

      const user = await requireBalance(req.uid, amount);

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
          phone: user.phone || "",
          quantity: 1,
          ...payloadExtra,
        },
        20000
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
