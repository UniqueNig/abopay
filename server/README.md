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
| GET | `/api/vtu/data-plans/:network` | Bearer | real VTpass data bundle codes/prices for a network — call before showing plan options |
| GET | `/api/vtu/cable-plans/:provider` | Bearer | real VTpass cable bouquet codes/prices for a provider |
| POST | `/api/vtu/airtime` | Bearer | VTpass airtime |
| POST | `/api/vtu/data` | Bearer | VTpass data bundle — `variationCode` must come from `/data-plans`, not be guessed |
| POST | `/api/vtu/bill` | Bearer | VTpass electricity/cable — cable requires `variationCode` from `/cable-plans` |

All `Bearer` routes expect `Authorization: Bearer <Firebase ID token>` —
get it in the frontend with `await auth.currentUser.getIdToken()`.

## Request / response examples

All bodies are JSON. `$TOKEN` = a Firebase ID token, `$API` = the base URL
(`http://localhost:4000` locally).

### Create/fetch profile

```bash
curl -X POST $API/api/users -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"fullName":"Jane Doe","phone":"08012345678"}'
# → { "user": { "uid": "...", "accountNumber": "01234567890", "balance": 0, ... } }

curl $API/api/users/me -H "Authorization: Bearer $TOKEN"
# → { "user": { ...profile, "transactions": [ { "id", "type", "title", "amount", "date", "category", "reference" }, ... ] } }
```

### Deposit

```bash
curl -X POST $API/api/deposits/verify -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"reference":"NB-1234567890-1"}'
# → { "success": true, "amount": 1000 }
# Errors: 400 payment not confirmed / email mismatch, 404 user not found
```

### Bank transfer

```bash
curl -X POST $API/api/transfers -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountNumber":"0123456789","bankCode":"058","accountName":"Jane Doe","amount":500,"narration":"Rent"}'
# → { "success": true, "status": "success", "reference": "TRF-..." }
# 502 "Transfers are not fully configured yet..." → disable OTP in Paystack Settings → Preferences
```

### Wallet-to-wallet transfer

```bash
curl $API/api/wallet-transfers/lookup/01234567890 -H "Authorization: Bearer $TOKEN"
# → { "fullName": "Jane Doe" }

curl -X POST $API/api/wallet-transfers -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountNumber":"01234567890","amount":500,"narration":"Lunch"}'
# → { "success": true, "reference": "WTX-...", "recipientName": "Jane Doe" }
```

### VTU — data plans must be fetched before purchase

```bash
curl $API/api/vtu/data-plans/mtn -H "Authorization: Bearer $TOKEN"
# → VTpass's raw response; plan list is under content.varations (note VTpass's
#   own spelling), each with { variation_code, name, variation_amount }

curl -X POST $API/api/vtu/data -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"network":"mtn","phone":"08011111111","variationCode":"<from data-plans>","amount":<matching variation_amount>}'
```

### VTU — airtime

```bash
curl -X POST $API/api/vtu/airtime -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"network":"mtn","phone":"08011111111","amount":200}'
# Sandbox test phone numbers (see main README/chat history for the full table):
# 08011111111 = success, anything else = failed
```

### VTU — bill (electricity / cable)

```bash
curl -X POST $API/api/vtu/bill -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"billType":"electricity","provider":"EKEDC","meterNumber":"1234567890","amount":2000,"meterType":"prepaid"}'
# cable requires variationCode from /api/vtu/cable-plans/:provider first
```

**Every route returns errors as** `{ "error": "message" }` with a matching
HTTP status (400 validation, 401 auth, 404 not found, 502 upstream failure).
