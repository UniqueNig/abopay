import { ProductPrice } from "../models/ProductPrice.js";
import { vtpassVariations } from "./vtpass.js";
import { ApiError } from "../middleware/errorHandler.js";

// No row yet for this network → sell at face value, zero recorded margin.
// Keeps an unconfigured network working exactly like before this catalog existed.
const DEFAULT_AIRTIME_RATE = { buyingPrice: 100, sellingPrice: 100 };

export async function getAirtimeRate(serviceID) {
  const row = await ProductPrice.findOne({ category: "airtime", serviceID, key: serviceID }).lean();
  return row ? { buyingPrice: row.buyingPrice, sellingPrice: row.sellingPrice } : DEFAULT_AIRTIME_RATE;
}

// Looks up an existing row for this exact plan; creates one seeded from
// VTpass's live price (both buying and selling, i.e. "sell at cost" until an
// admin bothers to configure a margin) if this plan has never been seen
// before. Called by both the purchase routes (for the authoritative price —
// closes the client-`amount`-tampering gap) and the admin catalog page.
export async function getOrSyncPlanPrice(category, serviceID, variationCode, label, liveVtpassAmount) {
  const existing = await ProductPrice.findOne({ serviceID, key: variationCode });
  if (existing) return existing;

  return ProductPrice.create({
    category,
    serviceID,
    key: variationCode,
    label,
    buyingPrice: liveVtpassAmount,
    sellingPrice: liveVtpassAmount,
  });
}

// Authoritative price for a single plan purchase — never trusts a
// client-supplied amount. Checks the stored catalog first (the common case,
// already seeded by a prior admin-page view or purchase); falls back to a
// live VTpass lookup (and seeds the catalog for next time) if this exact
// plan has never been touched before. Used by the /data and cable-branch-of
// -/bill purchase routes in vtu.js.
export async function resolvePlanPrice(category, serviceID, variationCode) {
  const existing = await ProductPrice.findOne({ serviceID, key: variationCode });
  if (existing) return existing;

  const live = await vtpassVariations(serviceID);
  const match = (live?.content?.varations || []).find((v) => v.variation_code === variationCode);
  if (!match) throw new ApiError(400, "Unknown or unavailable plan. Please pick again.");

  return getOrSyncPlanPrice(category, serviceID, variationCode, match.name, parseFloat(match.variation_amount));
}

// For the admin catalog page — merges VTpass's live plan list with stored
// pricing, seeding any plan that's never been touched before. Returns both
// the live VTpass price and the stored price side by side so an admin can
// visually spot drift, rather than the system silently overwriting a
// manual override if VTpass's price changes later.
export async function listCatalog(category, serviceID) {
  const live = await vtpassVariations(serviceID);
  const variations = live?.content?.varations || [];

  const rows = [];
  for (const v of variations) {
    const liveAmount = parseFloat(v.variation_amount);
    const stored = await getOrSyncPlanPrice(category, serviceID, v.variation_code, v.name, liveAmount);
    rows.push({
      variationCode: v.variation_code,
      label: v.name,
      liveVtpassPrice: liveAmount,
      buyingPrice: stored.buyingPrice,
      sellingPrice: stored.sellingPrice,
    });
  }
  return rows;
}
