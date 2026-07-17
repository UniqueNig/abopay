import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { createTransferRecipient, initiateTransfer, resolveAccountNumber } from "../services/paystack.js";
import { debitWallet, creditWallet } from "../services/wallet.js";
import { verifyTransactionPin } from "../services/pin.js";
import { User } from "../models/User.js";
import { PendingTransfer } from "../models/PendingTransfer.js";

const router = Router();

// Lets the frontend show the real account holder's name before the user
// confirms a transfer, instead of just echoing back the account number.
router.get(
  "/resolve-account",
  requireAuth,
  [
    query("accountNumber").isString().trim().isLength({ min: 10, max: 10 }).withMessage("accountNumber must be 10 digits."),
    query("bankCode").isString().trim().notEmpty(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { accountNumber, bankCode } = req.query;
      const resolved = await resolveAccountNumber({ accountNumber, bankCode });
      res.json({ accountName: resolved.account_name });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/",
  requireAuth,
  [
    body("accountNumber").isString().trim().isLength({ min: 10, max: 10 }).withMessage("accountNumber must be 10 digits."),
    body("bankCode").isString().trim().notEmpty(),
    body("amount").isFloat({ gt: 0 }),
    body("narration").optional().isString().trim().isLength({ max: 100 }),
    body("pin").isString().matches(/^\d{4}$/).withMessage("A valid 4-digit PIN is required."),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { accountNumber, bankCode, amount, narration, pin } = req.body;

      const user = await User.findOne({ uid: req.uid });
      if (!user) throw new ApiError(404, "User not found.");
      if (user.suspended) throw new ApiError(403, "This account has been suspended.");
      if (user.balance < amount) throw new ApiError(400, "Insufficient balance."); // fast-fail UX only — debitWallet below is the real, atomic guard
      await verifyTransactionPin(req.uid, pin);

      // Resolve independently server-side — never trust a client-supplied name.
      const resolved = await resolveAccountNumber({ accountNumber, bankCode });
      const accountName = resolved.account_name;

      const recipient = await createTransferRecipient({ accountName, accountNumber, bankCode });
      const transferRef = "TRF-" + Date.now() + "-" + Math.floor(Math.random() * 100000);

      // Debit BEFORE calling Paystack, not after: debitWallet's balance check
      // runs inside a database transaction, so it's the only check here that's
      // actually safe against two concurrent requests both passing the plain
      // check above. Debiting first closes that race — a second concurrent
      // request now fails here, before any real money moves — instead of
      // debiting last, which would let two concurrent requests both send a
      // real Paystack transfer while only one (or neither) gets charged.
      await debitWallet(user.uid, amount, transferRef, `Transfer to ${accountName}`, "↗️", {
        bank: bankCode,
        accountName,
        narration: narration || "Transfer",
        recipientCode: recipient.recipient_code,
      });

      try {
        const transferData = await initiateTransfer({
          recipientCode: recipient.recipient_code,
          amount,
          reference: transferRef,
          narration,
        });

        // Paystack returns status "otp" when the account has "Confirm transfers
        // before sending" enabled (Dashboard → Settings → Preferences) — the
        // transfer isn't actually complete until a second API call finalizes it
        // with an OTP code, which this app has no flow for. Treat it as a
        // failure (refunded below) rather than leave the user charged for a
        // transfer stuck pending confirmation with no way to complete it.
        if (transferData.status === "otp") {
          throw new ApiError(
            502,
            "Transfers are not fully configured yet. Disable \"Confirm transfers before sending\" in Paystack Settings → Preferences."
          );
        }

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
        await creditWallet(user.uid, amount, transferRef + "_refund", `Refund: failed transfer to ${accountName}`, "↩️", {
          reason: "transfer_initiation_failed",
        });
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }
);

export default router;
