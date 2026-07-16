import mongoose from "mongoose";

const adminAuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    targetUid: { type: String, required: true },
    targetEmail: { type: String, default: "" },
    byUid: { type: String, required: true },
    byEmail: { type: String, default: "" },
  },
  { timestamps: true }
);

export const AdminAuditLog = mongoose.model("AdminAuditLog", adminAuditLogSchema);
