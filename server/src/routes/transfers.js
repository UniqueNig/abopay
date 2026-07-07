import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { createTransferRecipient, initiateTransfer } from "../services/paystack.js";
import { debitWallet } from "../services/wallet.js";
import { User } from "../models/User.js";
import { PendingTransfer } from "../models/PendingTransfer.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  [
    body("accountNumber").isString().trim().isLength({ min: 10, max: 10 }).withMessage("accountNumber must be 10 digits."),
    body("bankCode").isString().trim().notEmpty(),
    body("accountName").isString().trim().notEmpty(),
    body("amount").isFloat({ gt: 0 }),
    body("narration").optional().isString().trim().isLength({ max: 100 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { accountNumber, bankCode, accountName, amount, narration } = req.body;

      const user = await User.findOne({ uid: req.uid });
      if (!user) throw new ApiError(404, "User not found.");
      if (user.balance < amount) throw new ApiError(400, "Insufficient balance.");

      const recipient = await createTransferRecipient({ accountName, accountNumber, bankCode });
      const transferRef = "TRF-" + Date.now() + "-" + Math.floor(Math.random() * 100000);

      const transferData = await initiateTransfer({
        recipientCode: recipient.recipient_code,
        amount,
        reference: transferRef,
        narration,
      });

      // Debit only after Paystack accepts the transfer.
      await debitWallet(user.uid, amount, transferRef, `Transfer to ${accountNumber}`, "↗️", {
        bank: bankCode,
        accountName,
        narration: narration || "Transfer",
        transferStatus: transferData.status,
        recipientCode: recipient.recipient_code,
      });

      // So the webhook can refund if the transfer later fails/reverses.
      await PendingTransfer.create({
        uid: user.uid,
        amount,
        accountNumber,
        bankCode,
        accountName,
        narration: narration || "Transfer",
        transferReference: transferRef,
        recipientCode: recipient.recipient_code,
        status: transferData.status,
      });

      res.json({ success: true, status: transferData.status, reference: transferRef });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
