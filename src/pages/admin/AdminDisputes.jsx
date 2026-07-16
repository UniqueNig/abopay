import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { formatNaira, formatDate } from "../../utils/helpers";
import { FiAlertTriangle, FiAlertCircle, FiX } from "react-icons/fi";

const TABS = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const ResolveModal = ({ dispute, onClose, onSubmit, submitting }) => {
  const [note, setNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="card-glass p-6 w-full max-w-sm">
        <h2 className="font-syne font-bold text-white text-lg mb-1">Resolve Dispute</h2>
        <p className="text-white/40 font-dm text-sm mb-5">{dispute.email}</p>
        <div className="mb-4">
          <label className="text-white/60 font-dm text-xs mb-1.5 block">Refund amount (₦, optional)</label>
          <input type="number" min="0" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="input-field" placeholder="0.00" />
        </div>
        <div className="mb-4">
          <label className="text-white/60 font-dm text-xs mb-1.5 block">Resolution note</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} className="input-field min-h-[70px] resize-none" placeholder="e.g. Verified failed transfer, refunded to wallet" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 font-dm text-sm text-white/60 hover:text-white border border-white/10 rounded-xl py-2.5">Cancel</button>
          <button
            onClick={() => onSubmit({ note: note.trim(), refundAmount: Number(refundAmount) || 0 })}
            disabled={submitting}
            className="flex-1 font-dm text-sm font-medium rounded-xl py-2.5 bg-secondary text-primary disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Confirm Resolve"}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminDisputes = () => {
  const [tab, setTab] = useState("open");
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/admin/disputes?status=${tab}`);
      setDisputes(data.disputes || []);
    } catch (err) {
      setError(err.message || "Failed to load disputes.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const handleResolve = async (payload) => {
    setSubmitting(true);
    try {
      await api.post(`/admin/disputes/${resolving.id}/resolve`, { action: "resolve", ...payload });
      setResolving(null);
      load();
    } catch (err) {
      setError(err.message || "Failed to resolve dispute.");
    }
    setSubmitting(false);
  };

  const reject = async (id) => {
    try {
      await api.post(`/admin/disputes/${id}/resolve`, { action: "reject" });
      load();
    } catch (err) {
      setError(err.message || "Failed to reject dispute.");
    }
  };

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="font-syne font-bold text-white text-2xl">Transfer Disputes</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Investigate and resolve disputed transactions</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)} className={`px-4 py-2 rounded-xl font-dm text-sm whitespace-nowrap border transition-colors ${tab === t.value ? "bg-secondary/15 text-secondary border-secondary/25" : "text-white/50 border-white/10 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <div>
              <p className="text-red-400 font-dm text-sm">{error}</p>
              <p className="text-white/30 font-dm text-xs mt-1">Expected endpoint: <code>GET /api/admin/disputes</code>. See <code>ADMIN_SETUP.md</code>.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card-glass p-8 text-center text-white/35 font-dm text-sm">Loading disputes...</div>
        ) : disputes.length === 0 ? (
          <div className="card-glass p-10 text-center">
            <FiAlertTriangle className="text-white/20 mx-auto mb-3" size={28} />
            <p className="text-white/40 font-dm text-sm">No {tab !== "all" ? tab : ""} disputes.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {disputes.map((d) => (
              <div key={d.id} className="card-glass p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <Link to={`/admin/users/${d.uid}`} className="text-white font-dm text-sm font-medium hover:text-secondary">{d.email || d.uid}</Link>
                    <p className="text-white/35 font-dm text-xs mt-0.5">Ref: {d.transactionRef || "—"} · {d.createdAt ? formatDate(d.createdAt) : "—"}</p>
                  </div>
                  {d.status === "resolved" && d.refundAmount > 0 && (
                    <span className="text-secondary font-syne font-semibold text-sm shrink-0">Refunded {formatNaira(d.refundAmount)}</span>
                  )}
                </div>
                {d.reason && <p className="text-white/50 font-dm text-sm mb-3">{d.reason}</p>}
                {d.resolutionNote && <p className="text-white/35 font-dm text-xs italic mb-3">Resolution: {d.resolutionNote}</p>}
                {d.status === "open" && (
                  <div className="flex gap-2">
                    <button onClick={() => setResolving(d)} className="flex-1 bg-secondary/15 border border-secondary/25 text-secondary hover:bg-secondary/25 font-dm text-sm font-medium px-4 py-2.5 rounded-xl">
                      Resolve
                    </button>
                    <button onClick={() => reject(d.id)} className="flex items-center gap-1.5 text-white/50 hover:text-white border border-white/10 font-dm text-sm px-4 py-2.5 rounded-xl">
                      <FiX size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {resolving && (
        <ResolveModal dispute={resolving} onClose={() => setResolving(null)} onSubmit={handleResolve} submitting={submitting} />
      )}
    </AdminLayout>
  );
};

export default AdminDisputes;
