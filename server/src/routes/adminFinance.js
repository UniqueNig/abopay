import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { Transaction } from "../models/Transaction.js";
import { Expense } from "../models/Expense.js";
import { vtpassBalance } from "../services/vtpass.js";
import { getPaystackBalance } from "../services/paystack.js";

// Mounted at the same /api/admin base as routes/admin.js — three separate
// top-level paths (/finance, /api-wallet, /expenses), not nested under each
// other, matching exactly what AdminFinance.jsx calls.
const router = Router();

router.get("/finance", requireAdmin, async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 90);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const windowStart = new Date(startOfToday);
    windowStart.setDate(windowStart.getDate() - (days - 1));

    const [creditAgg] = await Transaction.aggregate([
      { $match: { type: "credit", createdAt: { $gte: windowStart } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    const [debitAgg] = await Transaction.aggregate([
      { $match: { type: "debit", createdAt: { $gte: windowStart } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    const dailySeries = await Transaction.aggregate([
      { $match: { createdAt: { $gte: windowStart } } },
      {
        $group: {
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, type: "$type" },
          total: { $sum: "$amount" },
        },
      },
    ]);
    const byDate = {};
    dailySeries.forEach((d) => {
      byDate[d._id.date] = byDate[d._id.date] || { credit: 0, debit: 0 };
      byDate[d._id.date][d._id.type] = d.total;
    });
    const series = [...Array(days)].map((_, i) => {
      const d = new Date(windowStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return { date: key, credit: byDate[key]?.credit || 0, debit: byDate[key]?.debit || 0 };
    });

    const expenseDocs = await Expense.find({ createdAt: { $gte: windowStart } }).sort({ createdAt: -1 }).lean();
    const totalExpenses = expenseDocs.reduce((sum, e) => sum + e.amount, 0);
    const totalCreditVolume = creditAgg?.total || 0;
    const totalDebitVolume = debitAgg?.total || 0;

    // Real, per-transaction recorded margin — airtime/data/cable record
    // meta.buyingPrice/sellingPrice (product-pricing catalog), transfers and
    // electricity bills record meta.fee/couponDiscount (flat/percent fee
    // model). Anything else (deposits, wallet transfers, admin adjustments)
    // correctly contributes zero margin — those aren't revenue-generating.
    const [marginAgg] = await Transaction.aggregate([
      { $match: { type: "debit", createdAt: { $gte: windowStart } } },
      {
        $project: {
          margin: {
            $cond: [
              { $and: [{ $ifNull: ["$meta.sellingPrice", false] }, { $ifNull: ["$meta.buyingPrice", false] }] },
              { $subtract: ["$meta.sellingPrice", "$meta.buyingPrice"] },
              {
                $cond: [
                  { $ifNull: ["$meta.fee", false] },
                  { $subtract: [{ $ifNull: ["$meta.fee", 0] }, { $ifNull: ["$meta.couponDiscount", 0] }] },
                  0,
                ],
              },
            ],
          },
        },
      },
      { $group: { _id: null, total: { $sum: "$margin" } } },
    ]);
    const totalMargin = (marginAgg?.total || 0) - totalExpenses;

    res.json({
      totals: {
        totalCreditVolume,
        totalDebitVolume,
        totalCount: (creditAgg?.count || 0) + (debitAgg?.count || 0),
        totalExpenses,
        // Rough estimate (transaction volume minus logged expenses), not real
        // accounting — matches how the admin page itself already frames this.
        netProfit: totalCreditVolume - totalExpenses,
        // Real profit: sum of actual recorded margin per transaction (see
        // above), minus logged expenses. More accurate than netProfit, but
        // only as complete as what each purchase route records.
        totalMargin,
      },
      series,
      expenses: expenseDocs.map((e) => ({ id: e._id, label: e.label, amount: e.amount, date: e.createdAt })),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/expenses",
  requireAdmin,
  [
    body("label").isString().trim().notEmpty(),
    body("amount").isFloat({ gt: 0 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const expense = await Expense.create({ label: req.body.label, amount: req.body.amount });
      res.status(201).json({ success: true, expense });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/api-wallet", requireAdmin, async (req, res, next) => {
  const errors = [];
  let vtpass = null;
  let paystack = null;

  try {
    vtpass = await vtpassBalance();
  } catch (err) {
    errors.push(`VTpass: ${err.publicMessage || err.message}`);
  }

  try {
    paystack = await getPaystackBalance();
  } catch (err) {
    errors.push(`Paystack: ${err.publicMessage || err.message}`);
  }

  res.json({ vtpass, paystack, errors });
});

export default router;
