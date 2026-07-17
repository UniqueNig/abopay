import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listExtraNetworks } from "../services/productPricing.js";
import { ApiError } from "../middleware/errorHandler.js";

// Admin-added networks/providers beyond the hardcoded defaults (e.g. a new
// "Smile" data option) — the frontend merges these with its existing
// hardcoded list (RECHARGE_NETWORKS / cable providers) for the picker.
const router = Router();

router.get("/:category", requireAuth, async (req, res, next) => {
  try {
    const { category } = req.params;
    if (!["airtime", "data", "cable"].includes(category)) throw new ApiError(400, `Unknown category: ${category}`);
    const networks = await listExtraNetworks(category);
    res.json({ networks });
  } catch (err) {
    next(err);
  }
});

export default router;
