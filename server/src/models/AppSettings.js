import mongoose from "mongoose";

// Singleton document — there's only ever one, fetched/created via
// services/settings.js. Field shape matches AdminSettings.jsx exactly.
const appSettingsSchema = new mongoose.Schema(
  {
    maintenanceMode: { type: Boolean, default: false },
    general: {
      supportEmail: { type: String, default: "" },
      supportPhone: { type: String, default: "" },
      minTransfer: { type: Number, default: 100 },
      maxTransfer: { type: Number, default: 1000000 },
    },
    servicesEnabled: {
      deposits: { type: Boolean, default: true },
      transfers: { type: Boolean, default: true },
      walletTransfers: { type: Boolean, default: true },
      airtime: { type: Boolean, default: true },
      data: { type: Boolean, default: true },
      bills: { type: Boolean, default: true },
    },
    pricing: {
      transferFeeFlat: { type: Number, default: 0 },
      transferFeePercent: { type: Number, default: 0 },
      // Field names kept as "Discount" to match the already-built admin UI,
      // but they function as a markup — see services/settings.js.
      airtimeDiscountPercent: { type: Number, default: 0 },
      dataDiscountPercent: { type: Number, default: 0 },
      billFeeFlat: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const AppSettings = mongoose.model("AppSettings", appSettingsSchema);
