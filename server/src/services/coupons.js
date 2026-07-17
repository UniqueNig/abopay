import { Coupon } from "../models/Coupon.js";
import { CouponRedemption } from "../models/CouponRedemption.js";
import { ApiError } from "../middleware/errorHandler.js";

// Looks up an active coupon and computes the discount, capped at feeAmount —
// a coupon can only zero out Abopay's own margin on a transaction, never
// discount the underlying VTpass/Paystack cost, so it can't make the
// business lose money regardless of what an admin configures it to.
// Returns null if no code was submitted (coupon is optional everywhere).
export async function previewCoupon(code, uid, feeAmount) {
  if (!code) return null;

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), active: true });
  if (!coupon) throw new ApiError(400, "Invalid or expired coupon code.");

  const already = await CouponRedemption.findOne({ couponId: coupon._id, uid });
  if (already) throw new ApiError(400, "You've already used this coupon.");

  const raw = coupon.type === "percent" ? feeAmount * (coupon.value / 100) : coupon.value;
  const discount = Math.min(feeAmount, Math.max(0, raw));

  return { coupon, discount };
}

// Called only after the purchase this coupon applied to actually succeeds —
// the unique index on {couponId, uid} makes this safe against a race with
// another concurrent redemption attempt by the same user.
export async function recordRedemption(couponId, uid, transactionRef) {
  await CouponRedemption.create({ couponId, uid, transactionRef });
  await Coupon.updateOne({ _id: couponId }, { $inc: { usedCount: 1 } });
}
