import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { ApiError } from "../middleware/errorHandler.js";
import { firebaseAuth } from "../config/firebaseAdmin.js";
import { AccountDeletionRequest } from "../models/AccountDeletionRequest.js";
import { User } from "../models/User.js";

const router = Router();

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const { status = "pending" } = req.query;
    const filter = status === "all" ? {} : { status };
    const docs = await AccountDeletionRequest.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({
      requests: docs.map((d) => ({ ...d, id: d._id, requestedAt: d.createdAt })),
    });
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
      const request = await AccountDeletionRequest.findById(req.params.id);
      if (!request) throw new ApiError(404, "Request not found.");

      const { action } = req.body;

      if (action === "approve") {
        // Permanently removes the Auth account and Mongo profile — no undo.
        // The frontend confirms this with the admin before calling here.
        await firebaseAuth.deleteUser(request.uid).catch((err) => {
          if (err.code !== "auth/user-not-found") throw err;
        });
        await User.deleteOne({ uid: request.uid });
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
