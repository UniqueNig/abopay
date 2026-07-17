import mongoose from "mongoose";

const systemLogSchema = new mongoose.Schema({
  level: { type: String, enum: ["info", "warn", "error"], default: "info" },
  source: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export const SystemLog = mongoose.model("SystemLog", systemLogSchema);
