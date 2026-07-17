import mongoose from "mongoose";

const loginLogSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
  },
  { timestamps: true }
);

export const LoginLog = mongoose.model("LoginLog", loginLogSchema);
