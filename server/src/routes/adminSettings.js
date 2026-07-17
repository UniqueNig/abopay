import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getSettings } from "../services/settings.js";
import { AppSettings } from "../models/AppSettings.js";

const router = Router();

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// The frontend always sends a complete replacement for whichever top-level
// key it's touching (e.g. a full `general` object with just one field
// changed), so a shallow $set on the patch's own keys is exactly right —
// no deep-merge needed.
router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const current = await getSettings();
    await AppSettings.updateOne({ _id: current._id }, { $set: req.body });
    const settings = await AppSettings.findById(current._id);
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

export default router;
