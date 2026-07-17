import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getSettings } from "../services/settings.js";

// Lets the frontend preview the real fee/markup-inclusive total before a
// user confirms a transfer/purchase — the backend routes are what actually
// enforce the charge, this is purely a UX preview.
const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.json({ pricing: settings.pricing });
  } catch (err) {
    next(err);
  }
});

export default router;
