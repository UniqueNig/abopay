import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { formatNaira, formatDate } from "../../utils/helpers";
import { FiSearch, FiChevronRight, FiUsers, FiAlertCircle } from "react-icons/fi";

const PAGE_SIZE = 20;

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [history, setHistory] = useState([]); // cursor stack for "previous"
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
      const data = await api.get(`/admin/users?${params.toString()}`);
      setUsers(data.users || []);
      setNextCursor(data.nextCursor || null);
      if (!opts.keepHistory) {
        setHistory([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load users.");
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
      <div className="p-5 lg:p-8 max-w-6xl">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-white text-2xl">Users</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Search, review, and manage every account</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone"
              className="input-field pl-10"
            />
          </div>
          <button type="submit" className="btn-primary px-6">Search</button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <div>
              <p className="text-red-400 font-dm text-sm">{error}</p>
              <p className="text-white/30 font-dm text-xs mt-1">
                Expected endpoint: <code>GET /api/admin/users</code>. See <code>ADMIN_SETUP.md</code>.
              </p>
            </div>
          </div>
        )}

        <div className="card-glass overflow-hidden">
          {/* Table header (desktop) */}
          <div className="hidden md:grid grid-cols-[2fr_1.3fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/8 text-white/35 font-dm text-xs uppercase tracking-wider">
            <span>User</span>
            <span>Phone</span>
            <span>Balance</span>
            <span>Joined</span>
            <span></span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-white/35 font-dm text-sm">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <FiUsers size={22} className="text-white/30" />
              </div>
              <p className="text-white font-syne font-semibold text-base mb-1">No users found</p>
              <p className="text-white/40 font-dm text-sm">Try a different search term</p>
            </div>
          ) : (
            users.map((u, i) => (
              <Link
                key={u.uid || i}
                to={`/admin/users/${u.uid}`}
                className={`grid grid-cols-1 md:grid-cols-[2fr_1.3fr_1fr_1fr_auto] gap-1 md:gap-4 px-5 py-4 hover:bg-white/5 transition-colors ${
                  i < users.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-secondary/15 border border-secondary/20 flex items-center justify-center shrink-0">
                    <span className="text-secondary font-syne font-bold text-xs">
                      {(u.fullName || u.email || "U")[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-dm text-sm font-medium truncate">{u.fullName || "Unnamed"}</p>
                      {u.suspended && (
                        <span className="text-[10px] font-dm bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded-full shrink-0">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="text-white/35 font-dm text-xs truncate">{u.email}</p>
                  </div>
                </div>
                <span className="text-white/60 font-dm text-sm self-center">{u.phone || "—"}</span>
                <span className="text-secondary font-syne font-semibold text-sm self-center">{formatNaira(u.balance ?? 0)}</span>
                <span className="text-white/40 font-dm text-xs self-center">{u.createdAt ? formatDate(u.createdAt) : "—"}</span>
                <span className="hidden md:flex items-center justify-end text-white/25">
                  <FiChevronRight size={16} />
                </span>
              </Link>
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
    </AdminLayout>
  );
};

export default AdminUsers;
