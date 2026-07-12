import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { verifyTransaction } from "../services/paystack.js";
import { creditWallet } from "../services/wallet.js";
import { User } from "../models/User.js";

const router = Router();

router.post(
  "/verify",
  requireAuth,
  [body("reference").isString().trim().notEmpty()],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { reference } = req.body;
      const paystackData = await verifyTransaction(reference);

      if (!paystackData.status || paystackData.data?.status !== "success")
        throw new ApiError(400, "Payment not confirmed by Paystack.");

      const tx = paystackData.data;
      const amountNaira = tx.amount / 100;

      const user = await User.findOne({ uid: req.uid });
      if (!user) throw new ApiError(404, "User record not found.");
      if (user.suspended) throw new ApiError(403, "This account has been suspended.");

      // Recompute from Paystack's own record of who paid — never trust client input for identity.
      if (user.email !== tx.customer?.email)
        throw new ApiError(403, "Payment email does not match account.");

      await creditWallet(user.uid, amountNaira, reference, "Wallet Deposit", "💳", {
        channel: tx.channel,
        paidAt: tx.paid_at,
      });

      res.json({ success: true, amount: amountNaira });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
