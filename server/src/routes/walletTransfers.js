import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { transferBetweenWallets } from "../services/wallet.js";
import { verifyTransactionPin } from "../services/pin.js";
import { User } from "../models/User.js";

const router = Router();

// Lets the sender confirm who they're paying before committing — same pattern
// as the bank-transfer flow's account name lookup — without leaking anything
// beyond the recipient's display name.
router.get(
  "/lookup/:accountNumber",
  requireAuth,
  [param("accountNumber").isString().trim().isLength({ min: 10, max: 10 })],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const recipient = await User.findOne({ accountNumber: req.params.accountNumber });
      if (!recipient) throw new ApiError(404, "No Abopay account found with that account number.");
      res.json({ fullName: recipient.fullName || recipient.accountNumber });
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
    body("amount").isFloat({ gt: 0 }),
    body("narration").optional().isString().trim().isLength({ max: 100 }),
    body("pin").isString().matches(/^\d{4}$/).withMessage("A valid 4-digit PIN is required."),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { accountNumber, amount, narration, pin } = req.body;

      const sender = await User.findOne({ uid: req.uid });
      if (!sender) throw new ApiError(404, "User not found.");
      if (sender.suspended) throw new ApiError(403, "This account has been suspended.");
      await verifyTransactionPin(req.uid, pin);

      const recipient = await User.findOne({ accountNumber });
      if (!recipient) throw new ApiError(404, "No Abopay account found with that account number.");
      if (recipient.uid === sender.uid) throw new ApiError(400, "You can't send money to yourself.");
      if (recipient.suspended) throw new ApiError(400, "This recipient account is suspended and can't receive transfers.");

      const reference = "WTX-" + Date.now() + "-" + Math.floor(Math.random() * 100000);

      await transferBetweenWallets({
        senderUid: sender.uid,
        recipientUid: recipient.uid,
        amount,
        reference,
        senderMeta: {
          title: `Transfer to ${recipient.fullName || recipient.accountNumber}`,
          narration: narration || "Wallet Transfer",
          recipientAccountNumber: recipient.accountNumber,
        },
        recipientMeta: {
          title: `Transfer from ${sender.fullName || sender.accountNumber}`,
          narration: narration || "Wallet Transfer",
          senderAccountNumber: sender.accountNumber,
        },
      });

      res.json({ success: true, reference, recipientName: recipient.fullName || recipient.accountNumber });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
