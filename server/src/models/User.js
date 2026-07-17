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
    transactionPinHash: { type: String, default: null },
    pinAttempts: { type: Number, default: 0 },
    // Locked after too many wrong PINs — only cleared via an admin-approved
    // PIN reset request (server/src/routes/adminPinRequests.js), not a timer.
    pinLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
