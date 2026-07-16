import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { ApiError } from "../middleware/errorHandler.js";
import { PinResetRequest } from "../models/PinResetRequest.js";
import { User } from "../models/User.js";

const router = Router();

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const { status = "pending" } = req.query;
    const filter = status === "all" ? {} : { status };
    const docs = await PinResetRequest.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ requests: docs.map((d) => ({ ...d, id: d._id, requestedAt: d.createdAt })) });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/resolve",
  requireAdmin,
  [body("action").isIn(["approve", "reject"])],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const request = await PinResetRequest.findById(req.params.id);
      if (!request) throw new ApiError(404, "Request not found.");

      const { action } = req.body;
      if (action === "approve") {
        // Clears any PIN hash so the user is prompted to set a new one —
        // no-op today since no PIN feature sets this field yet.
        await User.updateOne({ uid: request.uid }, { transactionPinHash: null });
      }

      request.status = action === "approve" ? "approved" : "rejected";
      request.resolvedAt = new Date();
      request.resolvedBy = req.uid;
      await request.save();

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
