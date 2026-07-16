import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    transactionRef: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["open", "resolved", "rejected"], default: "open" },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: null },
    resolutionNote: { type: String, default: null },
    refundAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Dispute = mongoose.model("Dispute", disputeSchema);
