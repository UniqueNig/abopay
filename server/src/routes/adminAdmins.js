import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { ApiError } from "../middleware/errorHandler.js";
import { firebaseAuth } from "../config/firebaseAdmin.js";
import { AdminAuditLog } from "../models/AdminAuditLog.js";

const router = Router();

// Admin-ness lives entirely on the Firebase Auth custom claim (admin: true)
// — no separate "admins" collection, same as scripts/grant-admin.js. Lists
// every Auth user carrying that claim by paging through all users.
router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const admins = [];
    let pageToken;
    do {
      const page = await firebaseAuth.listUsers(1000, pageToken);
      page.users.forEach((u) => {
        if (u.customClaims?.admin === true) {
          admins.push({
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || "",
            createdAt: u.metadata.creationTime,
            lastLogin: u.metadata.lastSignInTime,
            disabled: u.disabled,
          });
        }
      });
      pageToken = page.pageToken;
    } while (pageToken);
    res.json({ admins });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  requireAdmin,
  [body("email").isEmail().withMessage("A valid email is required.")],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { email } = req.body;
      let user;
      try {
        user = await firebaseAuth.getUserByEmail(email);
      } catch (err) {
        if (err.code === "auth/user-not-found") {
          throw new ApiError(404, "No account found with that email. They need to sign up first.");
        }
        throw err;
      }

      await firebaseAuth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
      await AdminAuditLog.create({
        action: "grant_admin",
        targetUid: user.uid,
        targetEmail: email,
        byUid: req.uid,
        byEmail: req.email || "",
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/:uid/revoke", requireAdmin, async (req, res, next) => {
  try {
    const { uid } = req.params;
    if (uid === req.uid) throw new ApiError(400, "You can't revoke your own admin access.");

    const user = await firebaseAuth.getUser(uid);
    const claims = { ...(user.customClaims || {}) };
    delete claims.admin;
    await firebaseAuth.setCustomUserClaims(uid, claims);

    await AdminAuditLog.create({
      action: "revoke_admin",
      targetUid: uid,
      targetEmail: user.email || "",
      byUid: req.uid,
      byEmail: req.email || "",
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
