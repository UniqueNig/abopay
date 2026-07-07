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
