import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { Dispute } from "../models/Dispute.js";

const router = Router();

// Lets a user flag a transaction as a problem — surfaces in the admin
// Disputes queue (routes/adminDisputes.js) for review/refund.
router.post(
  "/",
  requireAuth,
  [
    body("transactionRef").isString().trim().notEmpty(),
    body("reason").isString().trim().isLength({ min: 1, max: 500 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const dispute = await Dispute.create({
        uid: req.uid,
        email: req.email || "",
        transactionRef: req.body.transactionRef,
        reason: req.body.reason,
      });
      res.status(201).json({ success: true, id: dispute._id });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
