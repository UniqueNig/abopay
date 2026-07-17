import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { ApiError } from "../middleware/errorHandler.js";
import { Coupon } from "../models/Coupon.js";
import { Notification } from "../models/Notification.js";

// Mounted at the same /api/admin base as routes/admin.js — matches exactly
// what AdminMarketing.jsx calls: /admin/coupons, /admin/coupons/:id,
// /admin/notifications.
const router = Router();

router.get("/coupons", requireAdmin, async (req, res, next) => {
  try {
    const docs = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json({ coupons: docs.map((c) => ({ ...c, id: c._id })) });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/coupons",
  requireAdmin,
  [
    body("code").isString().trim().notEmpty(),
    body("type").isIn(["percent", "fixed"]),
    body("value").isFloat({ gt: 0 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const code = req.body.code.trim().toUpperCase();
      const existing = await Coupon.findOne({ code });
      if (existing) throw new ApiError(400, "A coupon with that code already exists.");

      const coupon = await Coupon.create({ code, type: req.body.type, value: req.body.value });
      res.status(201).json({ success: true, coupon });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/coupons/:id",
  requireAdmin,
  [body("action").isIn(["toggle", "delete"])],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const coupon = await Coupon.findById(req.params.id);
      if (!coupon) throw new ApiError(404, "Coupon not found.");

      if (req.body.action === "delete") {
        await coupon.deleteOne();
      } else {
        coupon.active = !coupon.active;
        await coupon.save();
      }

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/notifications", requireAdmin, async (req, res, next) => {
  try {
    const docs = await Notification.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ notifications: docs.map((n) => ({ ...n, id: n._id })) });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/notifications",
  requireAdmin,
  [
    body("title").isString().trim().notEmpty(),
    body("body").isString().trim().notEmpty(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const notification = await Notification.create({ title: req.body.title, body: req.body.body });
      res.status(201).json({ success: true, notification });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
