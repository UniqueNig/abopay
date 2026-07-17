import cron from "node-cron";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { creditWallet } from "../services/wallet.js";
import { vtpassRequery } from "../services/vtpass.js";
import { SystemLog } from "../models/SystemLog.js";

const PENDING_STATUSES = ["pending", "initiated", "processing"];
const VTU_PREFIXES = ["AIR-", "DATA-", "BILL-"];

function requestIdFromReference(reference) {
  const prefix = VTU_PREFIXES.find((p) => reference.startsWith(p));
  return prefix ? reference.slice(prefix.length) : null;
}

// Re-queries a single VTU transaction against VTpass and reconciles it: marks
// delivered, or refunds the wallet if VTpass ultimately reports failure.
// Shared by the automatic cron below and the admin "Requery" button
// (routes/admin.js) — same logic either way, just a different trigger.
// Returns the fresh status, or null if the reference isn't a VTU transaction
// or VTpass still reports it pending (nothing changed).
export async function reconcileOneVtuTransaction(txn) {
  const requestId = requestIdFromReference(txn.reference);
  if (!requestId) return null;

  const result = await vtpassRequery(requestId);
  const status = result?.content?.transactions?.status;
  if (!status || PENDING_STATUSES.includes(status)) return null; // still pending

  if (status === "delivered" || status === "successful") {
    txn.meta = { ...txn.meta, deliveryStatus: status };
    await txn.save();
  } else {
    // VTpass ultimately failed the delivery — refund the wallet. creditWallet
    // is idempotent on reference, so calling this twice for the same
    // transaction (e.g. cron + manual requery both catching it) is safe.
    const user = await User.findById(txn.userId);
    if (user) {
      await creditWallet(user.uid, txn.amount, txn.reference + "_refund", `Refund: ${txn.title}`, "↩️", {
        reason: "vtu_delivery_failed",
        originalReference: txn.reference,
      });
    }
    txn.meta = { ...txn.meta, deliveryStatus: status };
    await txn.save();
  }

  return status;
}

// VTpass code "099" means "processing" at purchase time — the delivery isn't
// confirmed yet. This job re-queries any VTU transaction still marked pending
// a few minutes later and reconciles it. Runs every 5 minutes.
export function startVtuReconciliation() {
  cron.schedule("*/5 * * * *", async () => {
    const stale = new Date(Date.now() - 3 * 60_000); // give VTpass at least 3 min
    const candidates = await Transaction.find({
      reference: { $regex: /^(AIR|DATA|BILL)-/ },
      "meta.deliveryStatus": { $in: PENDING_STATUSES },
      createdAt: { $lte: stale },
    }).limit(50);

    let reconciled = 0;
    for (const txn of candidates) {
      try {
        const status = await reconcileOneVtuTransaction(txn);
        if (status) reconciled++;
      } catch (err) {
        console.error(`VTU requery failed for ${txn.reference}:`, err.message);
        await SystemLog.create({ level: "error", source: "reconcileVtu", message: `${txn.reference}: ${err.message}` }).catch(() => {});
      }
    }
    if (candidates.length > 0) {
      await SystemLog.create({
        level: "info",
        source: "reconcileVtu",
        message: `Checked ${candidates.length} pending VTU transaction(s), reconciled ${reconciled}.`,
      }).catch(() => {});
    }
  });
}
