import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { AccountDeletionRequest } from "../models/AccountDeletionRequest.js";

const router = Router();

// Customer-facing "Delete my account" trigger — doesn't delete anything
// itself, just queues a request for admin review (routes/adminAccountDeletions.js).
router.post(
  "/",
  requireAuth,
  [body("reason").optional().isString().trim().isLength({ max: 500 })],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const request = await AccountDeletionRequest.create({
        uid: req.uid,
        email: req.email || "",
        reason: req.body.reason || "",
      });
      res.status(201).json({ success: true, id: request._id });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
