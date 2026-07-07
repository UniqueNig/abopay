# Abopay — Nigerian VTU & Payments Platform

React + Vite + Firebase + Paystack

---

## Quick Start

```bash
npm install
cp .env.example .env        # fill in your keys
npm run dev
```

---

## Environment Variables (`.env`)

```
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...
```

Firebase keys are currently hardcoded in `src/firebase.js`.
Move them to `.env` before going to production:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## Deploy Firestore Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

Rules are in `firestore.rules`. Deploy them before going live — without
them, your Firestore database is either fully open or fully locked.

---

## What Works (Frontend Only)

| Feature | Status |
|---|---|
| Signup / Login / Google auth | ✅ |
| Wallet balance (starts at ₦0) | ✅ |
| Deposit via Paystack Inline v2 | ✅ |
| Transaction history | ✅ |
| Atomic balance updates (no race conditions) | ✅ |
| Duplicate transaction prevention | ✅ |
| Transfer form + Paystack payment | ✅ |
| Bills form + Paystack payment | ✅ |
| Recharge form + Paystack payment | ✅ |
| Firestore security rules | ✅ |

---

## What Still Needs a Backend

### 1. Paystack Transaction Verification (CRITICAL)
Currently the app credits/debits the wallet as soon as Paystack's
client-side `onSuccess` fires. This is NOT safe for production —
a user could replay or fake the callback.

**What to build:**
- A Firebase Cloud Function (or any server) that receives the
  Paystack reference and calls:
  `GET https://api.paystack.co/transaction/verify/:reference`
  using your **secret key** (never in the frontend).
- Only credit the wallet if `data.status === "success"` and
  `data.amount / 100 === expected_amount`.

### 2. Paystack Webhooks (needed for Bank Transfer / USSD payments)
Paystack card payments confirm instantly. But bank transfer, USSD,
and mobile money payments are asynchronous — the user completes
payment outside your page. Without a webhook, those users never
get credited.

**What to build:**
- A webhook endpoint that listens for `charge.success` events from
  Paystack and credits the wallet on confirmation.
- Set your webhook URL in Paystack Dashboard → Settings → API Keys & Webhooks.

### 3. Actual Airtime / Data / Bill Delivery
The recharge and bills pages collect payment via Paystack but do not
actually send airtime or pay the utility bill. You need a VTU API.

**Recommended providers:**
- **VTpass** (vtpass.com) — airtime, data, DSTV, electricity
- **Nellobytes** — similar coverage
- Integrate after verifying the Paystack payment server-side.

### 4. Actual Bank Transfers
The transfer form charges the user but does not move money to the
recipient's account. You need:
- Paystack Transfer Recipients API → create a recipient
- Paystack Transfers API → initiate the transfer
- Requires a **verified Paystack business account** with transfers enabled.

### 5. Firebase Keys in Environment Variables
`src/firebase.js` has hardcoded Firebase config. Before open-sourcing
or sharing the repo, move all values to `.env` and reference them via
`import.meta.env.VITE_*`.

---

## Architecture Diagram

```
Browser (React)
  │
  ├── Firebase Auth ──────────────────────► Firebase (Google)
  ├── Firestore (balance, transactions) ──► Firebase (Google)
  └── Paystack Inline v2 ─────────────────► Paystack
           │
           │  onSuccess fires client-side
           ▼
       ⚠️  MISSING: Cloud Function
           │  verify reference server-side
           │  then credit/debit wallet
           ▼
       Firestore (safe write)
```
