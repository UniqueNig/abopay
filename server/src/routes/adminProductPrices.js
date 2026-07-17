import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { ApiError } from "../middleware/errorHandler.js";
import { VTPASS_SERVICE, lookupService } from "../services/vtpass.js";
import { ProductPrice } from "../models/ProductPrice.js";
import { listCatalog, getAirtimeRate } from "../services/productPricing.js";

const router = Router();

router.get("/airtime", requireAdmin, async (req, res, next) => {
  try {
    const rows = await Promise.all(
      Object.entries(VTPASS_SERVICE.airtime).map(async ([network, serviceID]) => {
        const rate = await getAirtimeRate(serviceID);
        return { network, serviceID, buyingPrice: rate.buyingPrice, sellingPrice: rate.sellingPrice };
      })
    );
    res.json({ rows });
  } catch (err) {
    next(err);
  }
});

router.get("/data/:network", requireAdmin, async (req, res, next) => {
  try {
    const serviceID = lookupService("data", req.params.network.toLowerCase());
    if (!serviceID) throw new ApiError(400, `Unknown network: ${req.params.network}`);
    const rows = await listCatalog("data", serviceID);
    res.json({ serviceID, rows });
  } catch (err) {
    next(err);
  }
});

router.get("/cable/:provider", requireAdmin, async (req, res, next) => {
  try {
    const serviceID = lookupService("cable", req.params.provider);
    if (!serviceID) throw new ApiError(400, `Unknown cable provider: ${req.params.provider}`);
    const rows = await listCatalog("cable", serviceID);
    res.json({ serviceID, rows });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  requireAdmin,
  [
    body("category").isIn(["airtime", "data", "cable"]),
    body("serviceID").isString().trim().notEmpty(),
    body("key").isString().trim().notEmpty(),
    body("label").optional().isString().trim(),
    body("buyingPrice").isFloat({ min: 0 }),
    body("sellingPrice").isFloat({ min: 0 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const { category, serviceID, key, label, buyingPrice, sellingPrice } = req.body;
      const row = await ProductPrice.findOneAndUpdate(
        { serviceID, key },
        { category, serviceID, key, label: label || "", buyingPrice, sellingPrice },
        { new: true, upsert: true }
      );
      res.json({ success: true, row });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
