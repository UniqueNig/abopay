import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { ApiError } from "../middleware/errorHandler.js";
import { Transaction } from "../models/Transaction.js";
import { reconcileOneVtuTransaction } from "../jobs/reconcileVtu.js";

const router = Router();

const TYPE_PREFIX = { airtime: "AIR-", data: "DATA-", bill: "BILL-" };

function shapeVtuTx(tx) {
  const type = tx.reference.startsWith("AIR-") ? "airtime" : tx.reference.startsWith("DATA-") ? "data" : "bill";
  const requestId = tx.reference.slice(tx.reference.indexOf("-") + 1);
  return {
    id: tx.reference,
    requestId,
    type,
    uid: tx.userId?.uid,
    amount: tx.amount,
    status: tx.meta?.deliveryStatus || "delivered",
    createdAt: tx.createdAt,
    network: tx.meta?.network,
    phone: tx.meta?.phone,
    provider: tx.meta?.provider,
    billType: tx.meta?.billType,
    billersCode: tx.meta?.billersCode,
  };
}

// Backed by the existing Transaction collection, filtered to VTU purchases
// (reference prefix AIR-/DATA-/BILL-) — no separate log needed since a
// Transaction is only ever created once VTpass returns at least a "099
// processing" response (see services/wallet.js). Outright immediate
// failures (never charged, never recorded) won't appear here — that would
// need a pre-attempt log this app doesn't keep.
router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const { status = "all", type = "all", limit = "50" } = req.query;
    const pageSize = Math.min(Number(limit) || 50, 200);

    const filter = {};
    if (type === "all") {
      filter.reference = { $regex: /^(AIR|DATA|BILL)-/ };
    } else if (TYPE_PREFIX[type]) {
      filter.reference = { $regex: new RegExp(`^${TYPE_PREFIX[type]}`) };
    } else {
      throw new ApiError(400, `Unknown type: ${type}`);
    }
    if (status !== "all") filter["meta.deliveryStatus"] = status;

    const docs = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .populate("userId", "uid")
      .lean();

    res.json({ requests: docs.map(shapeVtuTx) });
  } catch (err) {
    next(err);
  }
});

router.post("/:requestId/requery", requireAdmin, async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const txn = await Transaction.findOne({
      reference: { $in: [`AIR-${requestId}`, `DATA-${requestId}`, `BILL-${requestId}`] },
    });
    if (!txn) throw new ApiError(404, "No VTU transaction found with that request ID.");

    const status = await reconcileOneVtuTransaction(txn);
    res.json({ success: true, status: status || txn.meta?.deliveryStatus || "pending" });
  } catch (err) {
    next(err);
  }
});

export default router;
