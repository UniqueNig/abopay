import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, default: "" },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    balance: { type: Number, default: 0, min: 0 },
    savingsBalance: { type: Number, default: 0, min: 0 },
    accountNumber: { type: String, required: true, unique: true },
    suspended: { type: Boolean, default: false },
    // Unused until a real transaction-PIN feature ships — exists now so the
    // PIN Management admin queue has a real field to clear on approval.
    transactionPinHash: { type: String, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
