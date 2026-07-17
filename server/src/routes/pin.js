import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { setTransactionPin, verifyTransactionPin } from "../services/pin.js";

const router = Router();

const PIN_RULE = body("pin")
  .isString()
  .matches(/^\d{4}$/)
  .withMessage("PIN must be exactly 4 digits.");

// First-time set (no PIN exists yet, or one was just cleared by an
// admin-approved reset) doesn't need currentPin. Changing a known PIN does.
router.post(
  "/set",
  requireAuth,
  [PIN_RULE, body("currentPin").optional().isString().matches(/^\d{4}$/)],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { pin, currentPin } = req.body;
      const user = await User.findOne({ uid: req.uid });

      if (user?.transactionPinHash) {
        if (!currentPin) return res.status(400).json({ error: "Enter your current PIN to change it." });
        await verifyTransactionPin(req.uid, currentPin);
      }

      await setTransactionPin(req.uid, pin);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
