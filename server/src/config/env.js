import "dotenv/config";

const required = [
  "MONGODB_URI",
  "PAYSTACK_SECRET_KEY",
  "VTPASS_API_KEY",
  "VTPASS_PUBLIC_KEY",
  "VTPASS_SECRET_KEY",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  throw new Error(
    "Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH so the server can verify Firebase ID tokens."
  );
}

export const env = {
  port: process.env.PORT || 4000,
  allowedOrigin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
  mongodbUri: process.env.MONGODB_URI,
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
  vtpassApiKey: process.env.VTPASS_API_KEY,
  vtpassPublicKey: process.env.VTPASS_PUBLIC_KEY,
  vtpassSecretKey: process.env.VTPASS_SECRET_KEY,
  vtpassBaseUrl: process.env.VTPASS_BASE_URL || "https://sandbox.vtpass.com/api",
};
