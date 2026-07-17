import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { SystemLog } from "../models/SystemLog.js";

const router = Router();

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const docs = await SystemLog.find().sort({ timestamp: -1 }).limit(100).lean();
    res.json({ logs: docs.map((l) => ({ ...l, id: l._id })) });
  } catch (err) {
    next(err);
  }
});

export default router;
