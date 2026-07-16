import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { LoginLog } from "../models/LoginLog.js";

const router = Router();

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const { search = "", cursor = "", limit = "30" } = req.query;
    const pageSize = Math.min(Number(limit) || 30, 100);
    const skip = Number(cursor) || 0;

    const filter = {};
    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [{ email: new RegExp(escaped, "i") }, { uid: new RegExp(escaped, "i") }];
    }

    const total = await LoginLog.countDocuments(filter);
    const logs = await LoginLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean();

    const nextCursor = skip + pageSize < total ? String(skip + pageSize) : null;
    res.json({ logs, nextCursor });
  } catch (err) {
    next(err);
  }
});

export default router;
