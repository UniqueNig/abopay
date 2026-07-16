import mongoose from "mongoose";

const pinResetRequestSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export const PinResetRequest = mongoose.model("PinResetRequest", pinResetRequestSchema);
