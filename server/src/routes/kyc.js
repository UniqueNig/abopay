import { Router } from "express";
import multer from "multer";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { cloudinary, assertCloudinaryConfigured } from "../config/cloudinary.js";
import { KycSubmission } from "../models/KycSubmission.js";

const router = Router();

// Memory storage — files are uploaded straight to Cloudinary, never written
// to disk on this server.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per file
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new ApiError(400, "Only image files are accepted."));
    cb(null, true);
  },
});

async function uploadToCloudinary(uid, file, label) {
  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `kyc/${uid}`,
    public_id: `${label}-${Date.now()}`,
    // "authenticated" delivery keeps these private — not guessable/publicly
    // reachable, only readable via a signed URL (see adminKyc.js).
    type: "authenticated",
    resource_type: "image",
  });
  return result.public_id;
}

router.post(
  "/submit",
  requireAuth,
  upload.fields([{ name: "idImage", maxCount: 1 }, { name: "selfie", maxCount: 1 }]),
  [body("idType").isString().trim().notEmpty(), body("idNumber").isString().trim().notEmpty()],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      assertCloudinaryConfigured();

      const idImageFile = req.files?.idImage?.[0];
      const selfieFile = req.files?.selfie?.[0];
      if (!idImageFile || !selfieFile) throw new ApiError(400, "Both an ID photo and a selfie are required.");

      const [idImagePath, selfiePath] = await Promise.all([
        uploadToCloudinary(req.uid, idImageFile, "id"),
        uploadToCloudinary(req.uid, selfieFile, "selfie"),
      ]);

      // Replace any prior submission rather than piling up duplicates —
      // a rejected user resubmitting should just get one active record.
      await KycSubmission.findOneAndDelete({ uid: req.uid });
      const submission = await KycSubmission.create({
        uid: req.uid,
        idType: req.body.idType,
        idNumber: req.body.idNumber,
        idImagePath,
        selfiePath,
      });

      res.status(201).json({ success: true, id: submission._id });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
