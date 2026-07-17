import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getSettings } from "../services/settings.js";
import { getAirtimeRate } from "../services/productPricing.js";
import { VTPASS_SERVICE } from "../services/vtpass.js";

// Lets the frontend preview the real fee/markup-inclusive total before a
// user confirms a transfer/purchase — the backend routes are what actually
// enforce the charge, this is purely a UX preview.
const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const settings = await getSettings();

    // Airtime prices per-network via the product-pricing catalog now, not a
    // blanket percentage — see services/productPricing.js.
    const airtimeRates = {};
    for (const [network, serviceID] of Object.entries(VTPASS_SERVICE.airtime)) {
      const rate = await getAirtimeRate(serviceID);
      airtimeRates[network] = rate.sellingPrice;
    }

    res.json({ pricing: settings.pricing, airtimeRates });
  } catch (err) {
    next(err);
  }
});

export default router;
