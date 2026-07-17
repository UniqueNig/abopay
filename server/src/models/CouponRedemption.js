import mongoose from "mongoose";

// One doc per (coupon, user) redemption — the unique compound index is what
// actually enforces "one redemption per user per coupon" atomically, same
// idempotency pattern as Transaction.reference's unique index.
const couponRedemptionSchema = new mongoose.Schema(
  {
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
    uid: { type: String, required: true },
    transactionRef: { type: String, required: true },
  },
  { timestamps: true }
);

couponRedemptionSchema.index({ couponId: 1, uid: 1 }, { unique: true });

export const CouponRedemption = mongoose.model("CouponRedemption", couponRedemptionSchema);
