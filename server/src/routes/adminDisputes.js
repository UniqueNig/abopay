import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { ApiError } from "../middleware/errorHandler.js";
import { creditWallet } from "../services/wallet.js";
import { Dispute } from "../models/Dispute.js";

const router = Router();

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const { status = "open" } = req.query;
    const filter = status === "all" ? {} : { status };
    const disputes = await Dispute.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ disputes: disputes.map((d) => ({ ...d, id: d._id })) });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/resolve",
  requireAdmin,
  [
    body("action").isIn(["resolve", "reject"]),
    body("note").optional().isString().trim(),
    body("refundAmount").optional().isFloat({ min: 0 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { action, note, refundAmount } = req.body;
      const dispute = await Dispute.findById(req.params.id);
      if (!dispute) throw new ApiError(404, "Dispute not found.");

      if (action === "resolve" && refundAmount > 0) {
        const reference = "DSPT-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
        await creditWallet(dispute.uid, refundAmount, reference, `Dispute refund — ${dispute.transactionRef}`, "⚖️", {
          adminAction: true,
          adminUid: req.uid,
          disputeId: String(dispute._id),
        });
      }

      dispute.status = action === "resolve" ? "resolved" : "rejected";
      dispute.resolvedAt = new Date();
      dispute.resolvedBy = req.uid;
      dispute.resolutionNote = note || null;
      dispute.refundAmount = action === "resolve" ? Number(refundAmount) || 0 : 0;
      await dispute.save();

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
