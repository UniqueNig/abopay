import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { env } from "./env.js";

function loadServiceAccount() {
  if (env.firebaseServiceAccountJson) return JSON.parse(env.firebaseServiceAccountJson);
  return JSON.parse(readFileSync(env.firebaseServiceAccountPath, "utf8"));
}

const serviceAccount = loadServiceAccount();

// Firebase's default Storage bucket follows this naming convention for the
// project — same bucket the frontend's firebase.js config already points at.
const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
});

export const firebaseAuth = getAuth(app);
export const firebaseBucket = getStorage(app).bucket();
