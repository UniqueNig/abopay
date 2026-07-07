import cron from "node-cron";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { creditWallet } from "../services/wallet.js";
import { vtpassRequery } from "../services/vtpass.js";

const PENDING_STATUSES = ["pending", "initiated", "processing"];
const VTU_PREFIXES = ["AIR-", "DATA-", "BILL-"];

function requestIdFromReference(reference) {
  const prefix = VTU_PREFIXES.find((p) => reference.startsWith(p));
  return prefix ? reference.slice(prefix.length) : null;
}

// VTpass code "099" means "processing" at purchase time — the delivery isn't
// confirmed yet. This job re-queries any VTU transaction still marked pending
// a few minutes later and reconciles it: mark delivered, or refund the wallet
// if VTpass ultimately reports failure. Runs every 5 minutes.
export function startVtuReconciliation() {
  cron.schedule("*/5 * * * *", async () => {
    const stale = new Date(Date.now() - 3 * 60_000); // give VTpass at least 3 min
    const candidates = await Transaction.find({
      reference: { $regex: /^(AIR|DATA|BILL)-/ },
      "meta.deliveryStatus": { $in: PENDING_STATUSES },
      createdAt: { $lte: stale },
    }).limit(50);

    for (const txn of candidates) {
      const requestId = requestIdFromReference(txn.reference);
      if (!requestId) continue;

      try {
        const result = await vtpassRequery(requestId);
        const status = result?.content?.transactions?.status;
        if (!status || PENDING_STATUSES.includes(status)) continue; // still pending, try again next run

        if (status === "delivered" || status === "successful") {
          txn.meta = { ...txn.meta, deliveryStatus: status };
          await txn.save();
        } else {
          // VTpass ultimately failed the delivery — refund the wallet.
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
      } catch (err) {
        console.error(`VTU requery failed for ${txn.reference}:`, err.message);
      }
    }
  });
}
