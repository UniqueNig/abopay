// Sets the `admin: true` custom claim on a Firebase Auth user by email.
// Custom claims can only be set server-side — this is the one and only way
// an account becomes an admin, never settable from the browser.
//
// Usage:
//   node scripts/grant-admin.js someone@example.com
//   node scripts/grant-admin.js someone@example.com --revoke
import "dotenv/config";
import { firebaseAuth } from "../src/config/firebaseAdmin.js";

const email = process.argv[2];
const revoke = process.argv.includes("--revoke");

if (!email) {
  console.error("Usage: node scripts/grant-admin.js <email> [--revoke]");
  process.exit(1);
}

async function run() {
  const user = await firebaseAuth.getUserByEmail(email);
  await firebaseAuth.setCustomUserClaims(user.uid, { admin: !revoke });
  console.log(`${revoke ? "Revoked" : "Granted"} admin for ${email} (uid: ${user.uid}).`);
  console.log("They need to sign out and back in (or wait ~1hr for token refresh) for this to take effect.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
