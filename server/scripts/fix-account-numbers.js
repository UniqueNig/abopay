// One-off migration: re-issues a proper 10-digit account number for any user
// stuck with the old 11-digit format (generateAccountNumber() used to
// accidentally produce 11 digits — see server/src/routes/users.js history).
// Safe to run more than once — it only touches accounts that still don't
// have exactly 10 digits.
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";

function generateAccountNumber() {
  return "0" + Math.floor(Math.random() * 900000000 + 100000000);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const affected = await User.find({ $expr: { $ne: [{ $strLenCP: "$accountNumber" }, 10] } });
  console.log(`Found ${affected.length} account(s) with a non-10-digit account number.`);

  for (const user of affected) {
    let candidate;
    let attempts = 0;
    do {
      candidate = generateAccountNumber();
      attempts++;
    } while ((await User.exists({ accountNumber: candidate })) && attempts < 10);

    console.log(`${user.email}: ${user.accountNumber} -> ${candidate}`);
    user.accountNumber = candidate;
    await user.save();
  }

  console.log("Done.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
