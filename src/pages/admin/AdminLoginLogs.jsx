import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { formatDate, formatTime } from "../../utils/helpers";
import { FiSearch, FiAlertCircle, FiLogIn, FiChevronRight } from "react-icons/fi";

const PAGE_SIZE = 30;

const AdminLoginLogs = () => {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (useCursor = null, opts = {}) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", String(PAGE_SIZE));
      if (useCursor) params.set("cursor", useCursor);
      const data = await api.get(`/admin/login-logs?${params.toString()}`);
      setLogs(data.logs || []);
      setNextCursor(data.nextCursor || null);
      if (!opts.keepHistory) setHistory([]);
    } catch (err) {
      setError(err.message || "Failed to load login logs.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="p-5 lg:p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="font-syne font-bold text-white text-2xl">Login Logs</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Recent sign-ins across the platform</p>
        </div>

        <form onSubmit={handleSearch} className="relative mb-6">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Search by email or user ID..."
          />
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <div>
              <p className="text-red-400 font-dm text-sm">{error}</p>
              <p className="text-white/30 font-dm text-xs mt-1">
                Expected endpoint: <code>GET /api/admin/login-logs</code>. See <code>ADMIN_SETUP.md</code>.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card-glass p-8 text-center text-white/35 font-dm text-sm">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="card-glass p-10 text-center">
            <FiLogIn className="text-white/20 mx-auto mb-3" size={28} />
            <p className="text-white/40 font-dm text-sm">No login activity found.</p>
          </div>
        ) : (
          <div className="card-glass overflow-hidden">
            {logs.map((log, i) => (
              <Link
                key={log.id}
                to={`/admin/users/${log.uid}`}
                className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${
                  i < logs.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <FiLogIn size={15} className="text-secondary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-dm text-sm font-medium truncate">{log.email || log.uid}</p>
                    <p className="text-white/35 font-dm text-xs truncate">
                      {log.ip || "unknown IP"} · {log.userAgent ? log.userAgent.slice(0, 40) : "unknown device"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 pl-3">
                  <div className="text-right">
                    <p className="text-white/70 font-dm text-xs">{formatDate(log.timestamp)}</p>
                    <p className="text-white/35 font-dm text-xs">{formatTime(log.timestamp)}</p>
                  </div>
                  <FiChevronRight size={14} className="text-white/25" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {(history.length > 0 || nextCursor) && (
          <div className="flex justify-between items-center mt-5">
            <button
              onClick={goPrev}
              disabled={history.length === 0}
              className="font-dm text-sm text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={goNext}
              disabled={!nextCursor}
              className="font-dm text-sm text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminLoginLogs;
