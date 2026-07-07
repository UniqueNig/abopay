# Abopay — Deployment Guide

## Architecture

| Layer | Platform | What it does |
|---|---|---|
| **Frontend** | Vercel | React/Vite app — upload this repo to Vercel |
| **Backend functions** | Firebase Cloud Functions | Payment logic, VTpass, wallet |
| **Database** | Firebase Firestore | User balances, transactions |

VTpass sandbox keys are **already embedded** in `functions/index.js` — no setup needed.
When you're ready for production, swap them for live keys (see Step 5).

---

## Step 1 — Deploy Frontend to Vercel

1. Push this repo to GitHub (or upload the zip directly on vercel.com)
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Vercel auto-detects Vite. Set these **Environment Variables** in the Vercel dashboard:

```
VITE_PAYSTACK_PUBLIC_KEY    = pk_live_b3bc8e41bdd37be19d1f0cf30ba44b32cbd86082
VITE_FIREBASE_API_KEY       = AIzaSyDFNkPhGrIMfkFAPKMYuOf46T9jw8RUVlA
VITE_FIREBASE_AUTH_DOMAIN   = abopay-53bc4.firebaseapp.com
VITE_FIREBASE_PROJECT_ID    = abopay-53bc4
VITE_FIREBASE_STORAGE_BUCKET= abopay-53bc4.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID = 923181784158
VITE_FIREBASE_APP_ID        = 1:923181784158:web:2404543da727d44c53a8cf
VITE_FIREBASE_MEASUREMENT_ID= G-MBH4KPHK5Z
```

4. Click **Deploy** — done. Your frontend is live.

---

## Step 2 — Deploy Firebase Backend (2 secrets only)

The VTpass keys are already in the code. You only need to set the Paystack keys:

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools
firebase login

# Set only 2 secrets (VTpass is already baked in for sandbox)
firebase functions:secrets:set PAYSTACK_SECRET_KEY
# Paste your Paystack secret key: sk_live_...

firebase functions:secrets:set PAYSTACK_WEBHOOK_SECRET
# Paste the webhook secret from Paystack dashboard

# Deploy functions + Firestore rules
cd functions && npm install && cd ..
firebase deploy --only functions,firestore
```

---

## Step 3 — Set Paystack Webhook URL

In **Paystack Dashboard → Settings → API Keys & Webhooks → Webhook URL**, paste:

```
https://us-central1-abopay-53bc4.cloudfunctions.net/paystackWebhook
```

---

## Step 4 — Test (Sandbox Mode)

VTpass is already in **sandbox mode**. Use Paystack test cards to deposit,
then test airtime/data/bills — no real money moves.

VTpass sandbox test numbers: https://www.vtpass.com/documentation/mtn-airtime-vtu-api/

---

## Step 5 — Go Live

When ready for production, open `functions/index.js` and make two changes:

```js
// 1. Switch URL from sandbox to production:
const VTPASS_BASE = "https://vtpass.com/api";  // was sandbox.vtpass.com

// 2. Update the 3 VTpass key constants to your LIVE keys:
const _VTPASS_API_KEY    = "YOUR_LIVE_API_KEY";
const _VTPASS_PUBLIC_KEY = "YOUR_LIVE_PUBLIC_KEY";
const _VTPASS_SECRET_KEY = "YOUR_LIVE_SECRET_KEY";
```

Then redeploy functions:
```bash
firebase deploy --only functions
```

---

## Cloud Functions Summary

| Function | Triggered by | What it does |
|---|---|---|
| `verifyDeposit` | Frontend (after Paystack onSuccess) | Verifies payment, credits wallet |
| `paystackWebhook` | Paystack HTTP POST | Handles async payments, refunds failed transfers |
| `initiateTransfer` | Frontend (Transfer page) | Real bank transfer via Paystack Transfers API |
| `purchaseAirtime` | Frontend (Recharge page) | Debits wallet → VTpass delivers airtime |
| `purchaseData` | Frontend (Recharge page) | Debits wallet → VTpass activates data bundle |
| `payBill` | Frontend (Bills page) | Debits wallet → VTpass pays electricity/cable bill |

---

## Money Flow

```
DEPOSIT:   User → Paystack popup → verifyDeposit Cloud Fn → Firestore (balance +)

TRANSFER:  User → initiateTransfer Cloud Fn → Paystack Transfers API → bank account
                                            → Firestore (balance -)

AIRTIME:   User → purchaseAirtime Cloud Fn → VTpass API → phone credited
                                           → Firestore (balance -)

DATA:      User → purchaseData Cloud Fn → VTpass API → data activated
                                        → Firestore (balance -)

BILLS:     User → payBill Cloud Fn → VTpass API → bill paid / electricity token returned
                                   → Firestore (balance -)
```
