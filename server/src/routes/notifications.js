import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Notification } from "../models/Notification.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const docs = await Notification.find().sort({ createdAt: -1 }).limit(10).lean();
    res.json({ notifications: docs.map((n) => ({ ...n, id: n._id })) });
  } catch (err) {
    next(err);
  }
});

export default router;
