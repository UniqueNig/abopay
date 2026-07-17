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
  // Comma-separated so both a local dev frontend and the deployed one can hit
  // the same backend without editing env vars every time you switch between them.
  allowedOrigins: (process.env.ALLOWED_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  mongodbUri: process.env.MONGODB_URI,
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
  vtpassApiKey: process.env.VTPASS_API_KEY,
  vtpassPublicKey: process.env.VTPASS_PUBLIC_KEY,
  vtpassSecretKey: process.env.VTPASS_SECRET_KEY,
  vtpassBaseUrl: process.env.VTPASS_BASE_URL || "https://sandbox.vtpass.com/api",
  // Not in `required` above — missing these should only break KYC uploads
  // (checked lazily in config/cloudinary.js), not take down the whole server
  // on deploy before the operator has had a chance to set them.
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  // Also optional — missing this should just silently skip sending emails
  // (see config/resend.js), never block signup or an admin's KYC/PIN review.
  resendApiKey: process.env.RESEND_API_KEY,
  resendFromEmail: process.env.RESEND_FROM_EMAIL,
};
