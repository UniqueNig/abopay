import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ["email", "sms"], required: true },
    subject: { type: String, default: null },
    message: { type: String, required: true },
    status: { type: String, enum: ["queued", "sent", "failed"], default: "queued" },
  },
  { timestamps: true }
);

export const Campaign = mongoose.model("Campaign", campaignSchema);
