import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, default: "" },
    reference: { type: String, required: true, unique: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
