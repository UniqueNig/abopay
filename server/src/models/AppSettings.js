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
    // Airtime/data pricing lives in the ProductPrice catalog now (see
    // models/ProductPrice.js, services/productPricing.js) — per-network
    // rates and per-plan prices, not a blanket percentage. Transfer/bill
    // fees stay here since they're still a flat/percent add-on.
    pricing: {
      transferFeeFlat: { type: Number, default: 0 },
      transferFeePercent: { type: Number, default: 0 },
      billFeeFlat: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const AppSettings = mongoose.model("AppSettings", appSettingsSchema);
