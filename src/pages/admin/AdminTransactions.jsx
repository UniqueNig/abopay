import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import TransactionDetailModal from "../../components/TransactionDetailModal";
import { api } from "../../api";
import { formatNaira, formatDate, formatTime } from "../../utils/helpers";
import { FiSearch, FiArrowUpRight, FiArrowDownLeft, FiList, FiAlertCircle } from "react-icons/fi";

const PAGE_SIZE = 30;
const TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "credit", label: "Credits" },
  { value: "debit", label: "Debits" },
];

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [cursor, setCursor] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTx, setSelectedTx] = useState(null);

  const load = async (useCursor = null, opts = {}) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (type) params.set("type", type);
      params.set("limit", String(PAGE_SIZE));
      if (useCursor) params.set("cursor", useCursor);
      const data = await api.get(`/admin/transactions?${params.toString()}`);
      setTransactions(data.transactions || []);
      setNextCursor(data.nextCursor || null);
      if (!opts.keepHistory) setHistory([]);
    } catch (err) {
      setError(err.message || "Failed to load transactions.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCursor(null);
    load(null);
  };

  const goNext = () => {
    if (!nextCursor) return;
    setHistory((h) => [...h, cursor]);
    setCursor(nextCursor);
    load(nextCursor, { keepHistory: true });
  };

  const goPrev = () => {
    const prev = history[history.length - 1] ?? null;
    setHistory((h) => h.slice(0, -1));
    setCursor(prev);
    load(prev, { keepHistory: true });
  };

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-5xl">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-white text-2xl">Transactions</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Every deposit, transfer, and payment across the platform</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <form onSubmit={handleSearch} className="relative flex-1 min-w-[220px] max-w-sm">
            <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference, title, or user email"
              className="input-field pl-10"
            />
          </form>
          <div className="flex gap-2">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setType(f.value)}
                className={`px-4 py-2 rounded-xl font-dm text-xs font-medium border transition-colors ${
                  type === f.value
                    ? "bg-secondary/15 border-secondary/25 text-secondary"
                    : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <div>
              <p className="text-red-400 font-dm text-sm">{error}</p>
              <p className="text-white/30 font-dm text-xs mt-1">
                Expected endpoint: <code>GET /api/admin/transactions</code>. See <code>ADMIN_SETUP.md</code>.
              </p>
            </div>
          </div>
        )}

        <div className="card-glass overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-white/35 font-dm text-sm">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <FiList size={22} className="text-white/30" />
              </div>
              <p className="text-white font-syne font-semibold text-base mb-1">No transactions found</p>
              <p className="text-white/40 font-dm text-sm">Try a different search or filter</p>
            </div>
          ) : (
            transactions.map((tx, i) => (
              <div
                key={tx.id || i}
                className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${
                  i < transactions.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <button onClick={() => setSelectedTx(tx)} className="flex items-center gap-3 text-left min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0">
                    {tx.category || "💳"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-dm text-sm font-medium truncate">{tx.title}</p>
                    <p className="text-white/35 font-dm text-xs truncate">
                      {formatDate(tx.date)} · {formatTime(tx.date)}
                      {tx.reference ? ` · ${tx.reference}` : ""}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-4 shrink-0 ml-3">
                  {tx.uid && (
                    <Link
                      to={`/admin/users/${tx.uid}`}
                      className="hidden sm:block text-white/40 hover:text-secondary font-dm text-xs truncate max-w-[140px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {tx.userEmail || tx.uid}
                    </Link>
                  )}
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
                </div>
              </div>
            ))
          )}
        </div>

        {(history.length > 0 || nextCursor) && (
          <div className="flex items-center justify-between mt-5">
            <button
              onClick={goPrev}
              disabled={history.length === 0 || loading}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white font-dm text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={goNext}
              disabled={!nextCursor || loading}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white font-dm text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {selectedTx && <TransactionDetailModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />}
    </AdminLayout>
  );
};

export default AdminTransactions;
