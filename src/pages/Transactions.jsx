import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import TransactionDetailModal from "../components/TransactionDetailModal";
import { useAuth } from "../context/AuthContext";
import { formatNaira, formatDate, formatTime } from "../utils/helpers";
import { FiArrowUpRight, FiArrowDownLeft, FiPlusCircle } from "react-icons/fi";
import { Link } from "react-router-dom";

const Transactions = () => {
  const { userData } = useAuth();
  const [selected, setSelected] = useState(null);

  const transactions = userData?.transactions
    ? [...userData.transactions].sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-3xl">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-white text-2xl">Transactions</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Every deposit, transfer, and payment on your account</p>
        </div>

        <div className="card-glass overflow-hidden">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-2xl">
                💳
              </div>
              <p className="text-white font-syne font-semibold text-base mb-1">No transactions yet</p>
              <p className="text-white/40 font-dm text-sm mb-5">Fund your wallet to get started</p>
              <Link
                to="/deposit"
                className="flex items-center gap-2 bg-secondary text-white font-syne font-bold text-sm px-6 py-3 rounded-xl hover:bg-green-400 transition-colors"
              >
                <FiPlusCircle size={15} />
                Deposit Money
              </Link>
            </div>
          ) : (
            transactions.map((tx, i) => (
              <button
                key={tx.id || i}
                onClick={() => setSelected(tx)}
                className={`w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors ${
                  i < transactions.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0">
                    {tx.category}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-dm text-sm font-medium truncate">{tx.title}</p>
                    <p className="text-white/35 font-dm text-xs">
                      {formatDate(tx.date)} · {formatTime(tx.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {tx.type === "credit" ? (
                    <FiArrowDownLeft size={13} className="text-secondary" />
                  ) : (
                    <FiArrowUpRight size={13} className="text-red-400" />
                  )}
                  <span
                    className={`font-syne font-semibold text-sm ${
                      tx.type === "credit" ? "text-secondary" : "text-red-400"
                    }`}
                  >
                    {tx.type === "debit" ? "-" : "+"}{formatNaira(tx.amount)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selected && <TransactionDetailModal transaction={selected} onClose={() => setSelected(null)} />}
    </DashboardLayout>
  );
};

export default Transactions;
