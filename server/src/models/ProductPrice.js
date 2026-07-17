import mongoose from "mongoose";

// One row per sellable item. For "airtime", buyingPrice/sellingPrice are a
// percent of face value (0-100) — VTpass sells airtime below face value, and
// there's no fixed "plan" to key on, so key === serviceID (the network).
// For "data"/"cable", buyingPrice/sellingPrice are a fixed ₦ amount, and key
// is VTpass's variation_code for that specific bundle/bouquet.
const productPriceSchema = new mongoose.Schema(
  {
    category: { type: String, enum: ["airtime", "data", "cable"], required: true },
    serviceID: { type: String, required: true },
    key: { type: String, required: true },
    label: { type: String, default: "" },
    buyingPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

productPriceSchema.index({ serviceID: 1, key: 1 }, { unique: true });

export const ProductPrice = mongoose.model("ProductPrice", productPriceSchema);
