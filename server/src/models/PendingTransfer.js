import mongoose from "mongoose";

const pendingTransferSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    accountNumber: { type: String, required: true },
    bankCode: { type: String, required: true },
    accountName: { type: String, required: true },
    narration: { type: String, default: "" },
    transferReference: { type: String, required: true, unique: true },
    recipientCode: { type: String, required: true },
    status: { type: String, required: true },
  },
  { timestamps: true }
);

export const PendingTransfer = mongoose.model("PendingTransfer", pendingTransferSchema);
