import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export const Expense = mongoose.model("Expense", expenseSchema);
