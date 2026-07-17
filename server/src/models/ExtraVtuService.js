import mongoose from "mongoose";

// An admin-added VTpass service beyond the hardcoded defaults in
// services/vtpass.js's VTPASS_SERVICE table — either merged into an
// existing network (data only, e.g. "glo-sme-data" merging into "glo") or a
// brand-new standalone network/provider (e.g. "smile-direct").
const extraVtuServiceSchema = new mongoose.Schema(
  {
    category: { type: String, enum: ["airtime", "data", "cable"], required: true },
    // Matches an existing hardcoded network key to merge into it, or is a
    // new key entirely (in which case label/color are required — see below).
    networkKey: { type: String, required: true },
    serviceID: { type: String, required: true },
    // Only meaningful when networkKey introduces a brand-new network —
    // ignored when merging into an existing one (the existing label/color
    // already used there applies).
    label: { type: String, default: "" },
    color: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

extraVtuServiceSchema.index({ category: 1, serviceID: 1 }, { unique: true });

export const ExtraVtuService = mongoose.model("ExtraVtuService", extraVtuServiceSchema);
