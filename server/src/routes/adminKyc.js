import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { ApiError } from "../middleware/errorHandler.js";
import { firebaseBucket } from "../config/firebaseAdmin.js";
import { KycSubmission } from "../models/KycSubmission.js";
import { User } from "../models/User.js";

const router = Router();

async function signedUrl(path) {
  const [url] = await firebaseBucket
    .file(path)
    .getSignedUrl({ action: "read", expires: Date.now() + 15 * 60 * 1000 }); // 15 min
  return url;
}

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const { status = "pending" } = req.query;
    const filter = status === "all" ? {} : { status };

    const docs = await KycSubmission.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    const uids = docs.map((d) => d.uid);
    const users = await User.find({ uid: { $in: uids } }).select("uid fullName email phone").lean();
    const userByUid = Object.fromEntries(users.map((u) => [u.uid, u]));

    const submissions = await Promise.all(
      docs.map(async (d) => {
        const [idImageUrl, selfieUrl] = await Promise.all([signedUrl(d.idImagePath), signedUrl(d.selfiePath)]);
        const u = userByUid[d.uid] || {};
        return {
          uid: d.uid,
          fullName: u.fullName || "",
          email: u.email || "",
          phone: u.phone || "",
          kyc: {
            status: d.status,
            idType: d.idType,
            idNumber: d.idNumber,
            idImageUrl,
            selfieUrl,
            submittedAt: d.createdAt,
            reviewedAt: d.reviewedAt,
            reviewedBy: d.reviewedBy,
            note: d.note,
          },
        };
      })
    );

    res.json({ submissions });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:uid/review",
  requireAdmin,
  [body("status").isIn(["verified", "rejected"]), body("note").optional().isString().trim()],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const submission = await KycSubmission.findOne({ uid: req.params.uid });
      if (!submission) throw new ApiError(404, "This user has no KYC submission.");

      submission.status = req.body.status;
      submission.reviewedAt = new Date();
      submission.reviewedBy = req.uid;
      submission.note = req.body.note || null;
      await submission.save();

      res.json({ success: true, status: submission.status });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
