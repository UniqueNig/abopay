import { ProductPrice } from "../models/ProductPrice.js";
import { ExtraVtuService } from "../models/ExtraVtuService.js";
import { vtpassVariations, listVtpassServices, VTPASS_CATEGORY_IDENTIFIER, VTPASS_SERVICE } from "./vtpass.js";
import { ApiError } from "../middleware/errorHandler.js";

// airtime has no addable candidates today besides "foreign-airtime", which
// needs its own country-selection UI — exposing it via the generic "add a
// service" tool would let an admin turn it on without the app actually
// supporting international recharge.
const EXCLUDED_FROM_ADD = { airtime: ["foreign-airtime"], data: [], cable: [] };

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
  if (existing) {
    // Blocks a direct purchase attempt against a plan an admin has hidden,
    // even if the request bypasses the (already-filtered) listing endpoint.
    if (!existing.active) throw new ApiError(400, "This plan is currently unavailable.");
    return existing;
  }

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
      serviceID,
      variationCode: v.variation_code,
      label: v.name,
      liveVtpassPrice: liveAmount,
      buyingPrice: stored.buyingPrice,
      sellingPrice: stored.sellingPrice,
      active: stored.active,
    });
  }
  return rows;
}

// All serviceIDs that fold into a given network/provider key — the
// hardcoded default (if any) plus any active admin-added extras (e.g. Glo's
// data list becomes ["glo-data", "glo-sme-data"] once an admin merges in the
// SME service). A brand-new network (no hardcoded entry) returns just its
// one admin-added serviceID.
export async function getServiceIDs(category, networkKey) {
  const hardcoded = VTPASS_SERVICE[category]?.[networkKey];
  const extras = await ExtraVtuService.find({ category, networkKey, active: true }).lean();
  const ids = extras.map((e) => e.serviceID);
  if (hardcoded && !ids.includes(hardcoded)) ids.unshift(hardcoded);
  return ids;
}

// Admin-added networks/providers that aren't one of the hardcoded ones —
// for the customer-facing network picker (merged with the hardcoded list
// client-side) and the admin catalog page's tab list.
export async function listExtraNetworks(category) {
  const hardcodedKeys = new Set(Object.keys(VTPASS_SERVICE[category] || {}));
  const extras = await ExtraVtuService.find({ category, active: true }).lean();
  const seen = new Set();
  const networks = [];
  for (const e of extras) {
    if (hardcodedKeys.has(e.networkKey) || seen.has(e.networkKey)) continue;
    seen.add(e.networkKey);
    networks.push({ id: e.networkKey, label: e.label, color: e.color });
  }
  return networks;
}

// VTpass services in this category not already in use (hardcoded or
// already added) — what the admin "add a service" picker offers.
export async function listAvailableToAdd(category) {
  const identifier = VTPASS_CATEGORY_IDENTIFIER[category];
  const live = await listVtpassServices(identifier);

  const inUse = new Set(Object.values(VTPASS_SERVICE[category] || {}));
  const added = await ExtraVtuService.find({ category }).select("serviceID").lean();
  added.forEach((e) => inUse.add(e.serviceID));

  const excluded = new Set(EXCLUDED_FROM_ADD[category] || []);

  return live
    .filter((s) => !inUse.has(s.serviceID) && !excluded.has(s.serviceID))
    .map((s) => ({ serviceID: s.serviceID, name: s.name }));
}
