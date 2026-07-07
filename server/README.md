# Abopay API (Express + MongoDB)

Replaces the Firebase Cloud Functions in [`../functions`](../functions) — same Paystack/VTpass
logic, ported to run on any Node host with MongoDB instead of Firestore.
Firebase Auth is still used for identity; this server only verifies ID tokens
(via `firebase-admin`), it never touches Firestore.

## Setup

```bash
cd server
npm install
cp .env.example .env   # fill in secrets
npm run dev
```

### MongoDB must be a replica set

Wallet credit/debit uses a MongoDB session transaction (`services/wallet.js`)
for atomicity — this requires a replica set, even a single-node one.

- **MongoDB Atlas**: free tier clusters are replica sets by default. Just use
  the connection string it gives you.
- **Local MongoDB**: start it as a single-node replica set:
  ```bash
  mongod --replSet rs0 --dbpath /path/to/data
  # then, once, from a mongo shell:
  rs.initiate()
  ```
  Set `MONGODB_URI=mongodb://localhost:27017/abopay?replicaSet=rs0`.

### Firebase service account

Download a service account key from Firebase Console → Project Settings →
Service Accounts, then either:
- paste the whole JSON as one line into `FIREBASE_SERVICE_ACCOUNT_JSON`, or
- save the file locally and point `FIREBASE_SERVICE_ACCOUNT_PATH` at it (keep
  it out of git — it's already covered by `.gitignore` if placed anywhere
  under `server/`).

### Paystack & VTpass keys

Use **test-mode** Paystack keys and VTpass **sandbox** keys while developing
(`VTPASS_BASE_URL` already defaults to sandbox). Only switch to live keys once
the whole flow — deposit → verify → webhook → transfer → VTU — has been
exercised end to end.

If you're migrating from the old `functions/index.js`: the VTpass keys that
used to be hardcoded there are considered compromised. Rotate them in the
VTpass dashboard before using them here.

## Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | liveness check |
| GET | `/api/users/me` | Bearer | profile + last 200 transactions |
| POST | `/api/users` | Bearer | create Mongo profile (idempotent, called post-signup) |
| POST | `/api/deposits/verify` | Bearer | verify a Paystack reference, credit wallet |
| POST | `/api/webhooks/paystack` | Paystack signature | async charge/transfer events |
| POST | `/api/transfers` | Bearer | bank transfer via Paystack Transfers API |
| GET | `/api/wallet-transfers/lookup/:accountNumber` | Bearer | resolve an Abopay account number to a display name (confirm-before-send) |
| POST | `/api/wallet-transfers` | Bearer | wallet-to-wallet transfer to another Abopay user, by account number — body: `{ accountNumber, amount, narration? }` |
| POST | `/api/vtu/airtime` | Bearer | VTpass airtime |
| POST | `/api/vtu/data` | Bearer | VTpass data bundle |
| POST | `/api/vtu/bill` | Bearer | VTpass electricity/cable |

All `Bearer` routes expect `Authorization: Bearer <Firebase ID token>` —
get it in the frontend with `await auth.currentUser.getIdToken()`.
