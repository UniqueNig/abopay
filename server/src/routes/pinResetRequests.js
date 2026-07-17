import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { PinResetRequest } from "../models/PinResetRequest.js";

const router = Router();

// The only way a user locked out after 5 wrong PIN attempts can get
// unstuck — queues a request for admin review (routes/adminPinRequests.js).
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const existing = await PinResetRequest.findOne({ uid: req.uid, status: "pending" });
    if (existing) return res.json({ success: true, id: existing._id, alreadyPending: true });

    const request = await PinResetRequest.create({ uid: req.uid, email: req.email || "" });
    res.status(201).json({ success: true, id: request._id });
  } catch (err) {
    next(err);
  }
});

export default router;
