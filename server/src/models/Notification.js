import mongoose from "mongoose";

// A single shared collection every user reads the latest N from — not
// per-user fan-out records.
const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
