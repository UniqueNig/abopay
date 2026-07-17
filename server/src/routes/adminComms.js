import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { Campaign } from "../models/Campaign.js";
import { User } from "../models/User.js";
import { sendBroadcastEmail } from "../services/email.js";

const router = Router();

router.get(
  "/",
  requireAdmin,
  [query("channel").optional().isIn(["email", "sms"])],
  async (req, res, next) => {
    try {
      const filter = req.query.channel ? { channel: req.query.channel } : {};
      const docs = await Campaign.find(filter).sort({ createdAt: -1 }).limit(50).lean();
      res.json({ campaigns: docs.map((c) => ({ ...c, id: c._id })) });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/",
  requireAdmin,
  [
    body("channel").isIn(["email", "sms"]),
    body("subject").optional({ nullable: true }).isString().trim(),
    body("message").isString().trim().notEmpty(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { channel, subject, message } = req.body;
      const campaign = await Campaign.create({ channel, subject: subject || null, message, status: "queued" });

      if (channel === "email") {
        try {
          const users = await User.find({ suspended: { $ne: true } }).select("email").lean();
          const { sent, failed } = await sendBroadcastEmail(
            users.map((u) => u.email),
            subject || "Update from Abopay",
            `<p>${message.replace(/\n/g, "<br/>")}</p><p>— The Abopay Team</p>`
          );
          campaign.status = sent > 0 ? "sent" : "failed";
          await campaign.save();
          return res.status(201).json({ success: true, campaign, sent, failed });
        } catch (err) {
          campaign.status = "failed";
          await campaign.save();
          return res.status(201).json({ success: true, campaign, error: err.publicMessage || err.message });
        }
      }

      // SMS: no provider wired in — stays queued, matching what the page
      // itself already discloses to the admin.
      res.status(201).json({ success: true, campaign });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
