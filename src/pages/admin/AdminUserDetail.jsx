import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import TransactionDetailModal from "../../components/TransactionDetailModal";
import { api } from "../../api";
import { formatNaira, formatDate, formatTime } from "../../utils/helpers";
import {
  FiArrowLeft, FiArrowUpRight, FiArrowDownLeft, FiAlertCircle,
  FiShield, FiShieldOff, FiPlusCircle, FiMinusCircle, FiX, FiCheck,
} from "react-icons/fi";

const AdjustModal = ({ type, onClose, onSubmit, submitting }) => {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) return;
    onSubmit({ amount: num, reason: reason.trim() || `Manual ${type} by admin` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="card-glass p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-syne font-bold text-white text-lg">
            {type === "credit" ? "Credit Wallet" : "Debit Wallet"}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <FiX size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-white/60 font-dm text-xs mb-1.5 block">Amount (₦)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-white/60 font-dm text-xs mb-1.5 block">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-field"
              placeholder="e.g. Refund for failed transfer"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className={`btn-primary flex items-center justify-center gap-2 mt-1 disabled:opacity-60 disabled:cursor-not-allowed ${
              type === "debit" ? "!bg-red-500 hover:!bg-red-400" : ""
            }`}
          >
            {submitting ? "Processing..." : <>Confirm {type === "credit" ? "Credit" : "Debit"}</>}
          </button>
        </form>
      </div>
    </div>
  );
};

const AdminUserDetail = () => {
  const { uid } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [selectedTx, setSelectedTx] = useState(null);
  const [adjustType, setAdjustType] = useState(null); // "credit" | "debit" | null
  const [submitting, setSubmitting] = useState(false);
  const [suspending, setSuspending] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/admin/users/${uid}`);
      setUser(data.user || data);
    } catch (err) {
      setError(err.message || "Failed to load user.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const handleAdjust = async ({ amount, reason }) => {
    setSubmitting(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await api.post(`/admin/users/${uid}/adjust`, {
        type: adjustType,
        amount,
        reason,
      });
      setActionSuccess(
        `Wallet ${adjustType === "credit" ? "credited" : "debited"} successfully. New balance: ${formatNaira(res.newBalance ?? 0)}`
      );
      setAdjustType(null);
      load();
    } catch (err) {
      setActionError(err.message || "Failed to adjust wallet.");
    }
    setSubmitting(false);
  };

  const toggleSuspend = async () => {
    setSuspending(true);
    setActionError("");
    setActionSuccess("");
    try {
      const nextState = !user?.suspended;
      await api.post(`/admin/users/${uid}/suspend`, { suspended: nextState });
      setActionSuccess(nextState ? "Account suspended." : "Account reactivated.");
      load();
    } catch (err) {
      setActionError(err.message || "Failed to update account status.");
    }
    setSuspending(false);
  };

  const transactions = user?.transactions
    ? [...user.transactions].sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-4xl">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-white/40 hover:text-white font-dm text-sm mb-6 transition-colors">
          <FiArrowLeft size={15} />
          Back to Users
        </Link>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <div>
              <p className="text-red-400 font-dm text-sm">{error}</p>
              <p className="text-white/30 font-dm text-xs mt-1">
                Expected endpoint: <code>GET /api/admin/users/{"{uid}"}</code>. See <code>ADMIN_SETUP.md</code>.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card-glass p-8 text-center text-white/35 font-dm text-sm">Loading user...</div>
        ) : !user ? null : (
          <>
            {actionSuccess && (
              <div className="bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
                <FiCheck className="text-secondary shrink-0" size={16} />
                <p className="text-secondary font-dm text-sm">{actionSuccess}</p>
              </div>
            )}
            {actionError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
                <FiAlertCircle className="text-red-400 shrink-0" size={16} />
                <p className="text-red-400 font-dm text-sm">{actionError}</p>
              </div>
            )}

            {/* Profile card */}
            <div className="card-glass p-6 mb-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-secondary/15 border border-secondary/20 flex items-center justify-center">
                    <span className="text-secondary font-syne font-bold text-xl">
                      {(user.fullName || user.email || "U")[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-syne font-bold text-white text-xl">{user.fullName || "Unnamed User"}</h1>
                      {user.suspended && (
                        <span className="text-[10px] font-dm bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="text-white/40 font-dm text-sm">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={toggleSuspend}
                  disabled={suspending}
                  className={`flex items-center gap-2 font-dm text-xs font-medium px-4 py-2.5 rounded-xl border transition-colors disabled:opacity-60 ${
                    user.suspended
                      ? "border-secondary/25 text-secondary hover:bg-secondary/10"
                      : "border-red-500/25 text-red-400 hover:bg-red-500/10"
                  }`}
                >
                  {user.suspended ? <FiShield size={14} /> : <FiShieldOff size={14} />}
                  {suspending ? "Updating..." : user.suspended ? "Reactivate Account" : "Suspend Account"}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <p className="text-white/35 font-dm text-[11px] uppercase tracking-wider mb-1">Balance</p>
                  <p className="text-secondary font-syne font-bold text-sm">{formatNaira(user.balance ?? 0)}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <p className="text-white/35 font-dm text-[11px] uppercase tracking-wider mb-1">Phone</p>
                  <p className="text-white font-dm text-sm">{user.phone || "—"}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <p className="text-white/35 font-dm text-[11px] uppercase tracking-wider mb-1">Account No.</p>
                  <p className="text-white font-dm text-sm">{user.accountNumber || "—"}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <p className="text-white/35 font-dm text-[11px] uppercase tracking-wider mb-1">Joined</p>
                  <p className="text-white font-dm text-sm">{user.createdAt ? formatDate(user.createdAt) : "—"}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setAdjustType("credit")}
                  className="flex-1 flex items-center justify-center gap-2 bg-secondary/15 border border-secondary/25 text-secondary hover:bg-secondary/25 font-dm text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                >
                  <FiPlusCircle size={15} />
                  Credit Wallet
                </button>
                <button
                  onClick={() => setAdjustType("debit")}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 font-dm text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                >
                  <FiMinusCircle size={15} />
                  Debit Wallet
                </button>
              </div>
            </div>

            {/* Transactions */}
            <div>
              <h2 className="font-syne font-semibold text-white text-base mb-4">Transaction History</h2>
              <div className="card-glass overflow-hidden">
                {transactions.length === 0 ? (
                  <div className="py-12 text-center text-white/35 font-dm text-sm">No transactions yet</div>
                ) : (
                  transactions.map((tx, i) => (
                    <button
                      key={tx.id || i}
                      onClick={() => setSelectedTx(tx)}
                      className={`w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors ${
                        i < transactions.length - 1 ? "border-b border-white/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base">
                          {tx.category || "💳"}
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
                        <span className={`font-syne font-semibold text-sm ${tx.type === "credit" ? "text-secondary" : "text-red-400"}`}>
                          {tx.type === "debit" ? "-" : "+"}{formatNaira(tx.amount)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {selectedTx && <TransactionDetailModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />}
      {adjustType && (
        <AdjustModal
          type={adjustType}
          onClose={() => setAdjustType(null)}
          onSubmit={handleAdjust}
          submitting={submitting}
        />
      )}
    </AdminLayout>
  );
};

export default AdminUserDetail;
