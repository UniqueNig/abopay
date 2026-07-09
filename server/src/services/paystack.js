import axios from "axios";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/errorHandler.js";

const client = axios.create({
  baseURL: "https://api.paystack.co",
  headers: { Authorization: `Bearer ${env.paystackSecretKey}`, "Content-Type": "application/json" },
  timeout: 10000,
});

export async function verifyTransaction(reference) {
  try {
    const res = await client.get(`/transaction/verify/${encodeURIComponent(reference)}`);
    return res.data;
  } catch (err) {
    console.error("Paystack verify error:", err.response?.data || err.message);
    throw new ApiError(502, "Could not verify payment. Try again.");
  }
}

// Resolves an account number to the real name on the account, via Paystack's
// bank verification (backed by NIBSS). Used so a user can see who they're
// actually about to pay before confirming a transfer.
export async function resolveAccountNumber({ accountNumber, bankCode }) {
  try {
    const res = await client.get("/bank/resolve", {
      params: { account_number: accountNumber, bank_code: bankCode },
    });
    return res.data.data; // { account_number, account_name, bank_id }
  } catch (err) {
    console.error("Resolve account error:", err.response?.data || err.message);
    throw new ApiError(400, "Could not verify account. Check the account number and bank.");
  }
}

export async function createTransferRecipient({ accountName, accountNumber, bankCode }) {
  try {
    const res = await client.post("/transferrecipient", {
      type: "nuban",
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: "NGN",
    });
    return res.data.data;
  } catch (err) {
    console.error("Create recipient error:", err.response?.data || err.message);
    throw new ApiError(502, "Could not verify account. Check details and try again.");
  }
}

export async function initiateTransfer({ recipientCode, amount, reference, narration }) {
  try {
    const res = await client.post("/transfer", {
      source: "balance",
      amount: Math.round(amount * 100),
      recipient: recipientCode,
      reason: narration || "Abopay Transfer",
      reference,
    });
    return res.data.data;
  } catch (err) {
    console.error("Transfer error:", err.response?.data || err.message);
    throw new ApiError(502, "Transfer failed. Try again.");
  }
}
