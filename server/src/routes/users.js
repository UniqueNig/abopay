import { Router } from "express";
import { body, validationResult } from "express-validator";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { sendWelcomeEmail } from "../services/email.js";

const router = Router();

// 10 digits total, matching NUBAN length — "0" + a 9-digit random number.
function generateAccountNumber() {
  return "0" + Math.floor(Math.random() * 900000000 + 100000000);
}

// Returns the user profile plus their 200 most recent transactions, mirroring
// the shape the frontend previously read straight off the Firestore user doc
// (userData.balance, userData.transactions) so AuthContext needs minimal changes.
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ uid: req.uid });
    if (!user) throw new ApiError(404, "User record not found.");

    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // Never send the hash itself — just whether one exists.
    const { transactionPinHash, ...userWithoutPinHash } = user.toObject();

    res.json({
      user: {
        ...userWithoutPinHash,
        hasPin: !!transactionPinHash,
        transactions: transactions.map((tx) => ({
          id: tx.reference,
          type: tx.type,
          title: tx.title,
          amount: tx.amount,
          date: tx.createdAt,
          category: tx.category,
          reference: tx.reference,
          ...tx.meta,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Called once right after Firebase signup/Google sign-in to create the Mongo profile.
// Idempotent on uid — safe to call again on every login.
router.post(
  "/",
  requireAuth,
  [
    body("fullName").optional().isString().trim().isLength({ max: 120 }),
    body("phone").optional().isString().trim().isLength({ max: 20 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const existing = await User.findOne({ uid: req.uid });
      if (existing) return res.json({ user: existing });

      const user = await User.create({
        uid: req.uid,
        email: req.email,
        fullName: req.body.fullName || "",
        phone: req.body.phone || "",
        accountNumber: generateAccountNumber(),
      });
      sendWelcomeEmail(user.email, user.fullName);
      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
