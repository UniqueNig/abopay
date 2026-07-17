import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { startVtuReconciliation } from "./jobs/reconcileVtu.js";

import webhooksRouter from "./routes/webhooks.js";
import usersRouter from "./routes/users.js";
import depositsRouter from "./routes/deposits.js";
import transfersRouter from "./routes/transfers.js";
import walletTransfersRouter from "./routes/walletTransfers.js";
import vtuRouter from "./routes/vtu.js";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import disputesRouter from "./routes/disputes.js";
import accountDeletionRequestsRouter from "./routes/accountDeletionRequests.js";
import kycRouter from "./routes/kyc.js";
import adminAdminsRouter from "./routes/adminAdmins.js";
import adminLoginLogsRouter from "./routes/adminLoginLogs.js";
import adminVtuTransactionsRouter from "./routes/adminVtuTransactions.js";
import adminDisputesRouter from "./routes/adminDisputes.js";
import adminAccountDeletionsRouter from "./routes/adminAccountDeletions.js";
import adminKycRouter from "./routes/adminKyc.js";
import adminPinRequestsRouter from "./routes/adminPinRequests.js";
import pinRouter from "./routes/pin.js";
import pinResetRequestsRouter from "./routes/pinResetRequests.js";
import adminSettingsRouter from "./routes/adminSettings.js";
import adminFinanceRouter from "./routes/adminFinance.js";
import adminMarketingRouter from "./routes/adminMarketing.js";
import adminCommsRouter from "./routes/adminComms.js";
import adminSystemLogsRouter from "./routes/adminSystemLogs.js";
import notificationsRouter from "./routes/notifications.js";
import pricingRouter from "./routes/pricing.js";

const app = express();

// Render (and most PaaS hosts) sit the app behind a reverse proxy — without
// this, req.ip resolves to the proxy's address for every request, which
// collapses express-rate-limit's per-IP buckets below into one shared bucket
// across all users instead of one per client. `1` trusts exactly one hop
// (the platform's proxy), not an arbitrary chain of client-supplied headers.
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (curl, server-to-server, Paystack webhook) — allow.
      if (!origin || env.allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
  })
);

// Webhook route must be mounted BEFORE the global JSON parser: it needs the
// raw request bytes (via express.raw(), applied in routes/webhooks.js) to
// verify Paystack's HMAC signature. If express.json() ran first it would
// consume the stream and re-serialize it, breaking signature verification.
const webhookLimiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use("/api/webhooks", webhookLimiter, webhooksRouter);

app.use(express.json());

const apiLimiter = rateLimit({ windowMs: 60_000, max: 30 });
app.use("/api/users", apiLimiter, usersRouter);
app.use("/api/deposits", apiLimiter, depositsRouter);
app.use("/api/transfers", apiLimiter, transfersRouter);
app.use("/api/wallet-transfers", apiLimiter, walletTransfersRouter);
app.use("/api/vtu", apiLimiter, vtuRouter);
app.use("/api/auth", apiLimiter, authRouter);
app.use("/api/disputes", apiLimiter, disputesRouter);
app.use("/api/account-deletion-requests", apiLimiter, accountDeletionRequestsRouter);
app.use("/api/pin-reset-requests", apiLimiter, pinResetRequestsRouter);
app.use("/api/notifications", apiLimiter, notificationsRouter);
app.use("/api/pricing", apiLimiter, pricingRouter);

// Tighter limiter than regular API traffic — this is exactly the endpoint a
// brute-force PIN guesser would hammer, on top of the 5-attempt account lock.
const pinLimiter = rateLimit({ windowMs: 60_000, max: 10 });
app.use("/api/pin", pinLimiter, pinRouter);

// Tighter limiter for file uploads specifically — larger request bodies,
// more expensive to process, no reason to allow the same volume as
// lightweight JSON endpoints.
const uploadLimiter = rateLimit({ windowMs: 60_000, max: 10 });
app.use("/api/kyc", uploadLimiter, kycRouter);

// Separate, tighter limiter — admin routes expose sensitive data and can
// move money, so they don't need the same headroom as regular user traffic.
const adminLimiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use("/api/admin", adminLimiter, adminRouter);
app.use("/api/admin/admins", adminLimiter, adminAdminsRouter);
app.use("/api/admin/login-logs", adminLimiter, adminLoginLogsRouter);
app.use("/api/admin/vtu-transactions", adminLimiter, adminVtuTransactionsRouter);
app.use("/api/admin/disputes", adminLimiter, adminDisputesRouter);
app.use("/api/admin/account-deletions", adminLimiter, adminAccountDeletionsRouter);
app.use("/api/admin/kyc", adminLimiter, adminKycRouter);
app.use("/api/admin/pin-requests", adminLimiter, adminPinRequestsRouter);
app.use("/api/admin/settings", adminLimiter, adminSettingsRouter);
// adminFinanceRouter and adminMarketingRouter define their own top-level
// sub-paths (/finance, /api-wallet, /expenses, /coupons, /notifications) —
// mounted at the same /api/admin base as adminRouter, not nested under it.
app.use("/api/admin", adminLimiter, adminFinanceRouter);
app.use("/api/admin", adminLimiter, adminMarketingRouter);
app.use("/api/admin/comms", adminLimiter, adminCommsRouter);
app.use("/api/admin/system-logs", adminLimiter, adminSystemLogsRouter);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use(errorHandler);

await connectDb();
startVtuReconciliation();
app.listen(env.port, () => console.log(`Abopay API listening on port ${env.port}`));
