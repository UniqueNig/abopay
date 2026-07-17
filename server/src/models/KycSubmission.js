import mongoose from "mongoose";

const kycSubmissionSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true },
    idType: { type: String, required: true },
    idNumber: { type: String, required: true },
    // Cloudinary public_ids (uploaded with type: "authenticated"), not public
    // URLs — KYC documents are sensitive, so signed delivery URLs are
    // generated fresh on each admin read rather than storing a raw link.
    // See routes/adminKyc.js.
    idImagePath: { type: String, required: true },
    selfiePath: { type: String, required: true },
    status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: null },
    note: { type: String, default: null },
  },
  { timestamps: true }
);

export const KycSubmission = mongoose.model("KycSubmission", kycSubmissionSchema);
