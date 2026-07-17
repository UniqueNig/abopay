import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { LoginLog } from "../models/LoginLog.js";

const router = Router();

// Called by the frontend right after a successful sign-in (email/password,
// Google, or the admin login screen — they all funnel through the same
// AuthContext.login/loginWithGoogle). Fire-and-forget on the frontend side,
// so failures here should never surface to the user.
router.post("/log-login", requireAuth, async (req, res, next) => {
  try {
    await LoginLog.create({
      uid: req.uid,
      email: req.email || "",
      userAgent: req.headers["user-agent"] || "",
      ip: req.ip || "",
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
