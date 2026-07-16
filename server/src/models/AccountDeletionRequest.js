import mongoose from "mongoose";

const accountDeletionRequestSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export const AccountDeletionRequest = mongoose.model("AccountDeletionRequest", accountDeletionRequestSchema);
