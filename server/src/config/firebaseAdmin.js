import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { env } from "./env.js";

function loadServiceAccount() {
  if (env.firebaseServiceAccountJson) return JSON.parse(env.firebaseServiceAccountJson);
  return JSON.parse(readFileSync(env.firebaseServiceAccountPath, "utf8"));
}

const serviceAccount = loadServiceAccount();

const app = initializeApp({
  credential: cert(serviceAccount),
});

export const firebaseAuth = getAuth(app);
