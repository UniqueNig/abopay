import { Router } from "express";
import express from "express";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { creditWallet } from "../services/wallet.js";
import { User } from "../models/User.js";
import { PendingTransfer } from "../models/PendingTransfer.js";
import { SystemLog } from "../models/SystemLog.js";

const router = Router();

function isValidSignature(rawBody, signature) {
  if (!signature) return false;
  // Paystack signs webhooks with the same secret key used for API calls —
  // there's no separate "webhook secret" in their system (unlike Stripe).
  const expected = crypto
    .createHmac("sha512", env.paystackSecretKey)
    .update(rawBody)
    .digest("hex");

  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  // Buffers must be equal length for timingSafeEqual, else it throws — treat length
  // mismatch itself as "invalid" rather than letting it crash the request.
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

// Mounted with express.raw() (see index.js) so the HMAC is computed over the
// exact bytes Paystack signed, not a re-serialized JSON.stringify(req.body).
router.post("/paystack", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  if (!isValidSignature(req.body, signature)) {
    console.warn("Invalid Paystack webhook signature");
    SystemLog.create({ level: "warn", source: "paystackWebhook", message: "Rejected a webhook call with an invalid signature." }).catch(() => {});
    return res.status(401).send("Unauthorized");
  }

  const event = JSON.parse(req.body.toString("utf8"));
  console.log("Webhook event:", event.event);

  try {
    if (event.event === "charge.success") {
      const tx = event.data;
      const customerEmail = tx.customer?.email;
      if (customerEmail) {
        const user = await User.findOne({ email: customerEmail });
        if (user) {
          const customFields = tx.metadata?.custom_fields || [];
          const txType = customFields.find((f) => f.variable_name === "type")?.value || "wallet_deposit";
          if (txType === "wallet_deposit") {
            await creditWallet(user.uid, tx.amount / 100, tx.reference, "Wallet Deposit", "💳", {
              channel: tx.channel,
              paidAt: tx.paid_at,
            });
          }
        }
      }
    }

    if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
      const tx = event.data;
      const pending = await PendingTransfer.findOne({ transferReference: tx.reference });
      if (pending) {
        await creditWallet(pending.uid, tx.amount / 100, tx.reference + "_refund", "Transfer Refund", "↩️", {
          reason: event.event,
        });
        await pending.deleteOne();
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    SystemLog.create({ level: "error", source: "paystackWebhook", message: err.message }).catch(() => {});
    // Still ack with 200 below — Paystack retries on non-2xx, and the write is
    // already idempotent by reference, so a retry storm from a transient error
    // (e.g. Mongo blip) is more likely to help than hurt here.
  }

  res.status(200).send("ok");
});

export default router;
