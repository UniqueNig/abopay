import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { ApiError } from "../middleware/errorHandler.js";
import { VTPASS_SERVICE } from "../services/vtpass.js";
import { ExtraVtuService } from "../models/ExtraVtuService.js";
import { listAvailableToAdd } from "../services/productPricing.js";

const router = Router();

router.get("/available/:category", requireAdmin, async (req, res, next) => {
  try {
    const { category } = req.params;
    if (!["airtime", "data", "cable"].includes(category)) throw new ApiError(400, `Unknown category: ${category}`);
    const services = await listAvailableToAdd(category);
    res.json({ services });
  } catch (err) {
    next(err);
  }
});

router.get("/:category", requireAdmin, async (req, res, next) => {
  try {
    const { category } = req.params;
    if (!["airtime", "data", "cable"].includes(category)) throw new ApiError(400, `Unknown category: ${category}`);
    const rows = await ExtraVtuService.find({ category }).sort({ createdAt: -1 }).lean();
    res.json({ rows });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  requireAdmin,
  [
    body("category").isIn(["airtime", "data", "cable"]),
    body("networkKey").isString().trim().notEmpty(),
    body("serviceID").isString().trim().notEmpty(),
    // Required unless merging into one of the hardcoded networks.
    body("label").optional().isString().trim(),
    body("color").optional().isString().trim(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { category, networkKey, serviceID, label, color } = req.body;
      const isNewNetwork = !Object.prototype.hasOwnProperty.call(VTPASS_SERVICE[category] || {}, networkKey);
      if (isNewNetwork && !label?.trim()) {
        throw new ApiError(400, "A label is required when adding a brand-new network.");
      }

      const existing = await ExtraVtuService.findOne({ category, serviceID });
      if (existing) throw new ApiError(400, "This service has already been added.");

      const row = await ExtraVtuService.create({
        category, networkKey, serviceID, label: label || "", color: color || "",
      });
      res.status(201).json({ success: true, row });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/:id/toggle", requireAdmin, async (req, res, next) => {
  try {
    const row = await ExtraVtuService.findById(req.params.id);
    if (!row) throw new ApiError(404, "Service not found.");
    row.active = !row.active;
    await row.save();
    res.json({ success: true, active: row.active });
  } catch (err) {
    next(err);
  }
});

export default router;
