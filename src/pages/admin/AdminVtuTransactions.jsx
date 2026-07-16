import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { formatNaira, formatDate, formatTime } from "../../utils/helpers";
import {
  FiAlertCircle, FiWifi, FiSmartphone, FiZap, FiTv, FiRefreshCw,
  FiClock, FiCheckCircle, FiXCircle, FiRotateCcw, FiLoader,
} from "react-icons/fi";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "initiated", label: "Initiated" },
  { value: "pending", label: "Pending" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
  { value: "reversed", label: "Reversed" },
];

const TYPE_TABS = [
  { value: "all", label: "All types", icon: null },
  { value: "data", label: "Data", icon: FiWifi },
  { value: "airtime", label: "Airtime", icon: FiSmartphone },
  { value: "bill", label: "Bills", icon: FiZap },
];

const STATUS_META = {
  initiated: { color: "text-white/50 bg-white/5 border-white/10", icon: FiLoader, label: "Initiated" },
  pending: { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25", icon: FiClock, label: "Pending" },
  delivered: { color: "text-secondary bg-secondary/10 border-secondary/25", icon: FiCheckCircle, label: "Delivered" },
  failed: { color: "text-red-400 bg-red-500/10 border-red-500/25", icon: FiXCircle, label: "Failed" },
  reversed: { color: "text-orange-400 bg-orange-500/10 border-orange-500/25", icon: FiRotateCcw, label: "Reversed" },
};

const TYPE_ICON = { data: FiWifi, airtime: FiSmartphone, bill: FiZap };

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.initiated;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-dm px-2.5 py-1 rounded-full border ${meta.color}`}>
      <Icon size={11} /> {meta.label}
    </span>
  );
};

const AdminVtuTransactions = () => {
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requeryingId, setRequeryingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/admin/vtu-transactions?status=${status}&type=${type}`);
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message || "Failed to load VTU transactions.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [status, type]);

  const requery = async (requestId) => {
    setRequeryingId(requestId);
    try {
      await api.post(`/admin/vtu-transactions/${requestId}/requery`, {});
      load();
    } catch (err) {
      setError(err.message || "Requery failed.");
    }
    setRequeryingId(null);
  };

  const labelFor = (r) => {
    if (r.type === "data") return `${(r.network || "").toUpperCase()} Data · ${r.phone}`;
    if (r.type === "airtime") return `${(r.network || "").toUpperCase()} Airtime · ${r.phone}`;
    if (r.type === "bill") return `${r.provider || ""} ${r.billType || ""} · ${r.billersCode || ""}`;
    return r.type;
  };

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-4xl">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="font-syne font-bold text-white text-2xl">VTU Transactions</h1>
            <p className="text-white/40 font-dm text-sm mt-1">Data, airtime & bill purchase flow via VTpass</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white font-dm text-xs px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6 mt-4">
          <p className="text-white/40 font-dm text-xs leading-relaxed">
            Flow: <span className="text-white/70">initiated</span> (VTpass called) →{" "}
            <span className="text-yellow-400/80">pending</span> (still processing — try Requery) →{" "}
            <span className="text-secondary/80">delivered</span> or{" "}
            <span className="text-red-400/80">failed</span>/<span className="text-orange-400/80">reversed</span>{" "}
            (wallet auto-refunded). VTpass also pushes updates to <code>vtpassWebhook</code> on its own —
            Requery is for checking sooner.
          </p>
        </div>

        <div className="flex gap-2 mb-3 overflow-x-auto">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              className={`px-3.5 py-1.5 rounded-lg font-dm text-xs whitespace-nowrap border transition-colors ${
                status === t.value ? "bg-secondary/15 text-secondary border-secondary/25" : "text-white/50 border-white/10 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {TYPE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-dm text-xs whitespace-nowrap border transition-colors ${
                type === t.value ? "bg-white/10 text-white border-white/20" : "text-white/40 border-white/10 hover:text-white/70"
              }`}
            >
              {t.icon && <t.icon size={12} />} {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <div>
              <p className="text-red-400 font-dm text-sm">{error}</p>
              <p className="text-white/30 font-dm text-xs mt-1">
                Expected endpoint: <code>GET /api/admin/vtu-transactions</code>. See <code>ADMIN_SETUP.md</code>.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card-glass p-8 text-center text-white/35 font-dm text-sm">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="card-glass p-10 text-center">
            <FiWifi className="text-white/20 mx-auto mb-3" size={28} />
            <p className="text-white/40 font-dm text-sm">No matching VTU transactions.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((r) => {
              const TypeIcon = TYPE_ICON[r.type] || FiWifi;
              return (
                <div key={r.id} className="card-glass p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <TypeIcon size={14} className="text-white/60" />
                      </div>
                      <div className="min-w-0">
                        <Link to={`/admin/users/${r.uid}`} className="text-white font-dm text-sm font-medium hover:text-secondary truncate block">
                          {labelFor(r)}
                        </Link>
                        <p className="text-white/35 font-dm text-xs truncate">
                          {r.createdAt ? `${formatDate(r.createdAt)} ${formatTime(r.createdAt)}` : "—"} · req {r.requestId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white font-syne font-semibold text-sm">{formatNaira(r.amount)}</p>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  {r.reason && <p className="text-red-400/70 font-dm text-xs mt-1">{r.reason}</p>}
                  {(r.status === "pending" || r.status === "initiated") && (
                    <button
                      onClick={() => requery(r.requestId)}
                      disabled={requeryingId === r.requestId}
                      className="mt-3 flex items-center gap-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white font-dm text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      <FiRefreshCw size={12} className={requeryingId === r.requestId ? "animate-spin" : ""} />
                      {requeryingId === r.requestId ? "Checking..." : "Requery VTpass"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminVtuTransactions;
