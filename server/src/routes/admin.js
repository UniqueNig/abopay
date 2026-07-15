import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { ApiError } from "../middleware/errorHandler.js";
import { creditWallet, debitWallet } from "../services/wallet.js";
import { firebaseAuth } from "../config/firebaseAdmin.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";

const router = Router();

// Escapes regex special characters in free-text search input before it's
// used to build a RegExp — otherwise a search term like "a.*" could behave
// unexpectedly (or, at worst, be used for a ReDoS attempt).
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const shapeTx = (tx) => ({
  id: tx.reference,
  type: tx.type,
  title: tx.title,
  amount: tx.amount,
  date: tx.createdAt,
  category: tx.category,
  reference: tx.reference,
  ...tx.meta,
});

router.get("/stats", requireAdmin, async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // today + 6 previous days = 7 total

    const [userStats] = await User.aggregate([
      { $group: { _id: null, totalUsers: { $sum: 1 }, totalBalance: { $sum: "$balance" } } },
    ]);
    const [txStats] = await Transaction.aggregate([
      { $group: { _id: null, totalTransactionCount: { $sum: 1 }, totalTransactionVolume: { $sum: "$amount" } } },
    ]);

    const newUsersToday = await User.countDocuments({ createdAt: { $gte: startOfToday } });
    const transactionsToday = await Transaction.countDocuments({ createdAt: { $gte: startOfToday } });

    // Distinct users who transacted today.
    const activeUserIdsToday = await Transaction.distinct("userId", { createdAt: { $gte: startOfToday } });
    const activeUsersToday = activeUserIdsToday.length;

    // "Deposits" = wallet top-ups specifically (creditWallet's default category
    // for both instant Paystack verification and the async webhook path).
    const depositMatch = { type: "credit", category: "💳" };
    const [todaysDepositsAgg] = await Transaction.aggregate([
      { $match: { ...depositMatch, createdAt: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const [monthlyDepositsAgg] = await Transaction.aggregate([
      { $match: { ...depositMatch, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // We only ever persist a Transaction after VTpass/Paystack confirms
    // success — a failed purchase never charges the wallet and never creates
    // a record (see services/wallet.js). So "failed" is genuinely always 0
    // here, and every stored transaction counts as successful by construction.
    const failedTransactionsToday = 0;
    const successfulTransactionsToday = transactionsToday;

    // 7-day inflow series for the dashboard chart. "revenue" here means total
    // money credited into wallets (deposits + incoming transfers), not a
    // margin/fee figure — this app absorbs the Paystack fee rather than
    // tracking it as separate revenue (see project notes on that decision).
    const dailyInflow = await Transaction.aggregate([
      { $match: { type: "credit", createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$amount" },
        },
      },
    ]);
    const inflowByDate = Object.fromEntries(dailyInflow.map((d) => [d._id, d.total]));
    const revenueVsFailed = [...Array(7)].map((_, i) => {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return { date: key, revenue: inflowByDate[key] || 0, failed: 0 };
    });

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("uid fullName email createdAt")
      .lean();

    const recentTxDocs = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "uid email")
      .lean();
    const recentTransactions = recentTxDocs.map((tx) => ({
      ...shapeTx(tx),
      uid: tx.userId?.uid,
      userEmail: tx.userId?.email,
    }));

    res.json({
      totalUsers: userStats?.totalUsers || 0,
      totalBalance: userStats?.totalBalance || 0,
      totalTransactionCount: txStats?.totalTransactionCount || 0,
      totalTransactionVolume: txStats?.totalTransactionVolume || 0,
      newUsersToday,
      transactionsToday,
      activeUsersToday,
      failedTransactionsToday,
      successfulTransactionsToday,
      todaysDeposits: todaysDepositsAgg?.total || 0,
      monthlyDeposits: monthlyDepositsAgg?.total || 0,
      revenueVsFailed,
      recentUsers,
      recentTransactions,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/users", requireAdmin, async (req, res, next) => {
  try {
    const { search = "", cursor = "", limit = "20" } = req.query;
    const pageSize = Math.min(Number(limit) || 20, 100);
    const skip = Number(cursor) || 0;

    const filter = {};
    if (search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select("uid fullName email phone balance accountNumber createdAt suspended")
      .lean();

    const nextCursor = skip + pageSize < total ? String(skip + pageSize) : null;
    res.json({ users, nextCursor });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:uid", requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findOne({ uid: req.params.uid }).lean();
    if (!user) throw new ApiError(404, "User not found.");

    const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(200).lean();

    res.json({ user: { ...user, transactions: transactions.map(shapeTx) } });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/users/:uid/adjust",
  requireAdmin,
  [
    body("type").isIn(["credit", "debit"]).withMessage("type must be 'credit' or 'debit'."),
    body("amount").isFloat({ gt: 0 }).withMessage("amount must be a positive number."),
    body("reason").optional().isString().trim().isLength({ max: 200 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { uid } = req.params;
      const { type, amount, reason } = req.body;

      const user = await User.findOne({ uid });
      if (!user) throw new ApiError(404, "User not found.");

      const reference = "ADM-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
      const title = reason || `Manual ${type} by admin`;
      const meta = { adminAction: true, adminUid: req.uid };

      if (type === "credit") {
        await creditWallet(uid, amount, reference, title, "🛠️", meta);
      } else {
        await debitWallet(uid, amount, reference, title, "🛠️", meta);
      }

      const updated = await User.findOne({ uid });
      res.json({ success: true, newBalance: updated.balance, reference });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/users/:uid/suspend",
  requireAdmin,
  [body("suspended").isBoolean().withMessage("suspended must be true or false.")],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { uid } = req.params;
      const { suspended } = req.body;

      const user = await User.findOneAndUpdate({ uid }, { suspended }, { new: true });
      if (!user) throw new ApiError(404, "User not found.");

      // Disables the Firebase Auth account itself, so a suspended user can't
      // even log in again — not just blocked from transacting.
      await firebaseAuth.updateUser(uid, { disabled: suspended });

      res.json({ success: true, suspended });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/transactions", requireAdmin, async (req, res, next) => {
  try {
    const { search = "", type = "", cursor = "", limit = "30" } = req.query;
    const pageSize = Math.min(Number(limit) || 30, 100);
    const skip = Number(cursor) || 0;

    const match = {};
    if (type) match.type = type;

    const pipeline = [
      { $match: match },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
    ];

    if (search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      pipeline.push({ $match: { $or: [{ title: regex }, { reference: regex }, { "user.email": regex }] } });
    }

    const [countResult] = await Transaction.aggregate([...pipeline, { $count: "total" }]);
    const total = countResult?.total || 0;

    pipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: pageSize });
    const docs = await Transaction.aggregate(pipeline);

    const transactions = docs.map((tx) => ({
      ...shapeTx(tx),
      uid: tx.user.uid,
      userEmail: tx.user.email,
    }));

    const nextCursor = skip + pageSize < total ? String(skip + pageSize) : null;
    res.json({ transactions, nextCursor });
  } catch (err) {
    next(err);
  }
});

export default router;
