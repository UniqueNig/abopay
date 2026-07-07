import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { ApiError } from "../middleware/errorHandler.js";

// Duplicate reference → E11000 on the unique index. Treated as an idempotent
// no-op since it means this reference was already credited/debited.
function isDuplicateKeyError(err) {
  return err && err.code === 11000;
}

export async function creditWallet(uid, amount, reference, title = "Wallet Deposit", category = "💳", meta = {}) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const user = await User.findOne({ uid }).session(session);
      if (!user) throw new ApiError(404, "User not found.");

      await Transaction.create(
        [{ userId: user._id, type: "credit", title, amount, category, reference, meta }],
        { session }
      );

      user.balance += amount;
      await user.save({ session });
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) return; // already processed
    throw err;
  } finally {
    session.endSession();
  }
}

// Debits the sender and credits the recipient in one Mongo transaction — unlike
// bank transfers (where Paystack is the external source of truth and a webhook
// can refund on failure), a wallet-to-wallet move has no external reconciliation
// path, so both writes must succeed or fail together.
export async function transferBetweenWallets({ senderUid, recipientUid, amount, reference, senderMeta = {}, recipientMeta = {} }) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const sender = await User.findOne({ uid: senderUid }).session(session);
      if (!sender) throw new ApiError(404, "Sender not found.");
      if (sender.balance < amount) throw new ApiError(400, "Insufficient balance.");

      const recipient = await User.findOne({ uid: recipientUid }).session(session);
      if (!recipient) throw new ApiError(404, "Recipient not found.");

      await Transaction.create(
        [{ userId: sender._id, type: "debit", title: senderMeta.title || "Wallet Transfer", amount, category: "↗️", reference, meta: senderMeta }],
        { session }
      );
      sender.balance -= amount;
      await sender.save({ session });

      await Transaction.create(
        [{ userId: recipient._id, type: "credit", title: recipientMeta.title || "Wallet Transfer", amount, category: "↙️", reference: `${reference}_in`, meta: recipientMeta }],
        { session }
      );
      recipient.balance += amount;
      await recipient.save({ session });
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) return; // already processed
    throw err;
  } finally {
    session.endSession();
  }
}

export async function debitWallet(uid, amount, reference, title, category = "💸", meta = {}) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const user = await User.findOne({ uid }).session(session);
      if (!user) throw new ApiError(404, "User not found.");
      if (user.balance < amount) throw new ApiError(400, "Insufficient balance.");

      await Transaction.create(
        [{ userId: user._id, type: "debit", title, amount, category, reference, meta }],
        { session }
      );

      user.balance -= amount;
      await user.save({ session });
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) return; // already processed
    throw err;
  } finally {
    session.endSession();
  }
}
