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

const app = express();

app.use(helmet());
app.use(cors({ origin: env.allowedOrigin }));

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

app.get("/health", (req, res) => res.json({ ok: true }));

app.use(errorHandler);

await connectDb();
startVtuReconciliation();
app.listen(env.port, () => console.log(`Abopay API listening on port ${env.port}`));
