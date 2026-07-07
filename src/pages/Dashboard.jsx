import React, { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { formatNaira, formatDate, formatTime } from "../utils/helpers";
import {
  FiSend, FiFileText, FiSmartphone, FiTrendingUp,
  FiArrowUpRight, FiArrowDownLeft, FiEye, FiEyeOff, FiPlusCircle,
} from "react-icons/fi";

const quickActions = [
  { to: "/deposit", icon: <FiPlusCircle size={22} />, label: "Deposit", color: "text-secondary", bg: "bg-secondary/15 border-secondary/30", hoverBg: "hover:bg-secondary/25" },
  { to: "/transfer", icon: <FiSend size={22} />, label: "Send Money", color: "text-sky-400", bg: "bg-sky-400/10 border-sky-400/25", hoverBg: "hover:bg-sky-400/20" },
  { to: "/bills", icon: <FiFileText size={22} />, label: "Pay Bills", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/25", hoverBg: "hover:bg-orange-400/20" },
  { to: "/recharge", icon: <FiSmartphone size={22} />, label: "Recharge", color: "text-gold", bg: "bg-gold/10 border-gold/25", hoverBg: "hover:bg-gold/20" },
];

const Dashboard = () => {
  const { userData, user } = useAuth();
  const [hideBalance, setHideBalance] = useState(false);

  const balance = userData?.balance ?? 0;
  const accountNo = userData?.accountNumber ?? "—";
  const transactions = userData?.transactions
    ? [...userData.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)
    : [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-5xl">
        {/* Greeting */}
        <div className="mb-7">
          <h1 className="font-syne font-bold text-white text-2xl">
            Good {greeting},{" "}
            <span className="text-gradient">{user?.displayName?.split(" ")[0] || "there"}</span> 👋
          </h1>
          <p className="text-white/40 font-dm text-sm mt-1">Here's your financial overview</p>
        </div>

        {/* Balance card */}
        <div className="card-glass p-6 glow-green relative overflow-hidden mb-7">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-secondary/5 -translate-y-16 translate-x-16 pointer-events-none" />
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-white/50 font-dm text-xs mb-1 uppercase tracking-widest">Wallet Balance</p>
              <p className="font-syne font-bold text-4xl text-white">
                {hideBalance ? "₦ ••••••••" : formatNaira(balance)}
              </p>
            </div>
            <button
              onClick={() => setHideBalance(!hideBalance)}
              className="text-white/30 hover:text-white/70 mt-1 transition-colors"
            >
              {hideBalance ? <FiEye size={18} /> : <FiEyeOff size={18} />}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/8 border border-white/12 rounded-xl px-4 py-2">
              <p className="text-white/40 font-dm text-[11px] uppercase tracking-wider mb-0.5">Account No.</p>
              <p className="text-white font-syne font-semibold text-sm">{accountNo}</p>
            </div>
            <div className="bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-2">
              <p className="text-white/40 font-dm text-[11px] uppercase tracking-wider mb-0.5">Bank</p>
              <p className="text-secondary font-syne font-semibold text-sm">Abopay</p>
            </div>
            {balance === 0 && (
              <Link
                to="/deposit"
                className="ml-auto flex items-center gap-2 bg-secondary text-white font-syne font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-green-400 transition-colors"
              >
                <FiPlusCircle size={15} />
                Add Money
              </Link>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-8">
          <h2 className="font-syne font-semibold text-white text-base mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((a, i) => (
              <Link
                key={i}
                to={a.to}
                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border ${a.bg} ${a.hoverBg} hover:scale-105 transition-all duration-200`}
              >
                <span className={a.color}>{a.icon}</span>
                <span className="text-white font-dm text-sm font-medium text-center">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-syne font-semibold text-white text-base">Recent Transactions</h2>
            {transactions.length > 0 && (
              <button className="text-secondary font-dm text-xs hover:underline">View all</button>
            )}
          </div>

          <div className="card-glass overflow-hidden">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-2xl">
                  💳
                </div>
                <p className="text-white font-syne font-semibold text-base mb-1">No transactions yet</p>
                <p className="text-white/40 font-dm text-sm mb-5">
                  Fund your wallet to get started
                </p>
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
                <div
                  key={tx.id || i}
                  className={`flex items-center justify-between p-4 ${i < transactions.length - 1 ? "border-b border-white/5" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base">
                      {tx.category}
                    </div>
                    <div>
                      <p className="text-white font-dm text-sm font-medium">{tx.title}</p>
                      <p className="text-white/35 font-dm text-xs">
                        {formatDate(tx.date)} · {formatTime(tx.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
