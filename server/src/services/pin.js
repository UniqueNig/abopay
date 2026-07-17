import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { ApiError } from "../middleware/errorHandler.js";

const MAX_ATTEMPTS = 5;

export async function setTransactionPin(uid, pin) {
  const hash = await bcrypt.hash(pin, 10);
  await User.updateOne({ uid }, { transactionPinHash: hash, pinAttempts: 0, pinLocked: false });
}

// Throws on any failure (no PIN set, locked, or wrong PIN) — callers just
// need to await this before proceeding, no separate boolean check.
export async function verifyTransactionPin(uid, pin) {
  const user = await User.findOne({ uid });
  if (!user) throw new ApiError(404, "User not found.");
  if (!user.transactionPinHash) throw new ApiError(400, "Set your transaction PIN first.");
  if (user.pinLocked) {
    throw new ApiError(403, "Your PIN is locked after too many failed attempts. Request a reset in Settings.");
  }

  const match = await bcrypt.compare(pin, user.transactionPinHash);
  if (!match) {
    user.pinAttempts += 1;
    if (user.pinAttempts >= MAX_ATTEMPTS) user.pinLocked = true;
    await user.save();
    throw new ApiError(
      user.pinLocked ? 403 : 400,
      user.pinLocked
        ? "Your PIN is now locked after too many failed attempts. Request a reset in Settings."
        : `Incorrect PIN. ${MAX_ATTEMPTS - user.pinAttempts} attempt(s) remaining.`
    );
  }

  if (user.pinAttempts > 0) {
    user.pinAttempts = 0;
    await user.save();
  }
}
