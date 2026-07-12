import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { formatNaira, formatDate, formatTime } from "../../utils/helpers";
import {
  FiUsers, FiTrendingUp, FiActivity, FiArrowUpRight, FiArrowDownLeft,
  FiUserPlus, FiAlertCircle, FiRefreshCw,
} from "react-icons/fi";

const TONE_CLASSES = {
  secondary: "bg-secondary/15 border-secondary/25 text-secondary",
  gold: "bg-gold/15 border-gold/25 text-gold",
  "sky-400": "bg-sky-400/15 border-sky-400/25 text-sky-400",
};

const StatCard = ({ icon, label, value, sub, tone = "secondary" }) => (
  <div className="card-glass p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${TONE_CLASSES[tone] || TONE_CLASSES.secondary}`}>
        {icon}
      </div>
    </div>
    <p className="text-white/40 font-dm text-xs uppercase tracking-wider mb-1">{label}</p>
    <p className="font-syne font-bold text-white text-2xl">{value}</p>
    {sub && <p className="text-white/35 font-dm text-xs mt-1">{sub}</p>}
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/admin/stats");
      setStats(data);
    } catch (err) {
      setError(err.message || "Failed to load admin stats.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-6xl">
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="font-syne font-bold text-white text-2xl">Admin Overview</h1>
            <p className="text-white/40 font-dm text-sm mt-1">Platform-wide activity at a glance</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white font-dm text-xs px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <div>
              <p className="text-red-400 font-dm text-sm">{error}</p>
              <p className="text-white/30 font-dm text-xs mt-1">
                This dashboard expects admin endpoints (e.g. <code>/api/admin/stats</code>) on your
                backend. See <code>ADMIN_SETUP.md</code> for the reference implementation.
              </p>
            </div>
          </div>
        )}

        {loading && !stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-glass p-5 h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<FiUsers size={17} />}
                label="Total Users"
                value={(stats?.totalUsers ?? 0).toLocaleString("en-NG")}
                sub={stats?.newUsersToday != null ? `+${stats.newUsersToday} today` : undefined}
              />
              <StatCard
                icon={<FiTrendingUp size={17} />}
                label="Total Wallet Balance"
                value={formatNaira(stats?.totalBalance ?? 0)}
                tone="gold"
              />
              <StatCard
                icon={<FiActivity size={17} />}
                label="Total Transactions"
                value={(stats?.totalTransactionCount ?? 0).toLocaleString("en-NG")}
                sub={stats?.transactionsToday != null ? `+${stats.transactionsToday} today` : undefined}
              />
              <StatCard
                icon={<FiArrowUpRight size={17} />}
                label="Total Volume Moved"
                value={formatNaira(stats?.totalTransactionVolume ?? 0)}
                tone="sky-400"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent signups */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-syne font-semibold text-white text-base">Recent Signups</h2>
                  <Link to="/admin/users" className="text-secondary font-dm text-xs hover:underline">View all</Link>
                </div>
                <div className="card-glass overflow-hidden">
                  {!stats?.recentUsers?.length ? (
                    <div className="py-10 text-center text-white/35 font-dm text-sm">No signups yet</div>
                  ) : (
                    stats.recentUsers.map((u, i) => (
                      <Link
                        key={u.uid || i}
                        to={`/admin/users/${u.uid}`}
                        className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${
                          i < stats.recentUsers.length - 1 ? "border-b border-white/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-secondary/15 border border-secondary/20 flex items-center justify-center shrink-0">
                            <FiUserPlus size={14} className="text-secondary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-dm text-sm font-medium truncate">{u.fullName || "Unnamed"}</p>
                            <p className="text-white/35 font-dm text-xs truncate">{u.email}</p>
                          </div>
                        </div>
                        <span className="text-white/40 font-dm text-xs shrink-0 ml-2">
                          {u.createdAt ? formatDate(u.createdAt) : ""}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* Recent transactions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-syne font-semibold text-white text-base">Recent Transactions</h2>
                  <Link to="/admin/transactions" className="text-secondary font-dm text-xs hover:underline">View all</Link>
                </div>
                <div className="card-glass overflow-hidden">
                  {!stats?.recentTransactions?.length ? (
                    <div className="py-10 text-center text-white/35 font-dm text-sm">No transactions yet</div>
                  ) : (
                    stats.recentTransactions.map((tx, i) => (
                      <div
                        key={tx.id || i}
                        className={`flex items-center justify-between p-4 ${
                          i < stats.recentTransactions.length - 1 ? "border-b border-white/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0">
                            {tx.category || "💳"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-dm text-sm font-medium truncate">{tx.title}</p>
                            <p className="text-white/35 font-dm text-xs truncate">
                              {tx.userEmail || tx.uid} · {formatDate(tx.date)} {formatTime(tx.date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {tx.type === "credit" ? (
                            <FiArrowDownLeft size={12} className="text-secondary" />
                          ) : (
                            <FiArrowUpRight size={12} className="text-red-400" />
                          )}
                          <span className={`font-syne font-semibold text-xs ${tx.type === "credit" ? "text-secondary" : "text-red-400"}`}>
                            {tx.type === "debit" ? "-" : "+"}{formatNaira(tx.amount)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
