import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { formatDate } from "../../utils/helpers";
import { FiUserX, FiAlertCircle, FiCheck, FiX } from "react-icons/fi";

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const AdminAccountDeletions = () => {
  const [tab, setTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/admin/account-deletions?status=${tab}`);
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message || "Failed to load deletion requests.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const resolve = async (id, action) => {
    if (action === "approve" && !window.confirm("This permanently deletes the account and all its data. Continue?")) return;
    setBusyId(id);
    try {
      await api.post(`/admin/account-deletions/${id}/resolve`, { action });
      load();
    } catch (err) {
      setError(err.message || "Failed to process request.");
    }
    setBusyId(null);
  };

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="font-syne font-bold text-white text-2xl">Account Deletions</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Review and process account-deletion requests</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2 rounded-xl font-dm text-sm whitespace-nowrap border transition-colors ${
                tab === t.value ? "bg-secondary/15 text-secondary border-secondary/25" : "text-white/50 border-white/10 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <div>
              <p className="text-red-400 font-dm text-sm">{error}</p>
              <p className="text-white/30 font-dm text-xs mt-1">
                Expected endpoint: <code>GET /api/admin/account-deletions</code>. See <code>ADMIN_SETUP.md</code>.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card-glass p-8 text-center text-white/35 font-dm text-sm">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="card-glass p-10 text-center">
            <FiUserX className="text-white/20 mx-auto mb-3" size={28} />
            <p className="text-white/40 font-dm text-sm">No {tab !== "all" ? tab : ""} requests.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((r) => (
              <div key={r.id} className="card-glass p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link to={`/admin/users/${r.uid}`} className="text-white font-dm text-sm font-medium hover:text-secondary truncate block">
                    {r.email || r.uid}
                  </Link>
                  <p className="text-white/35 font-dm text-xs mt-1">
                    Requested {r.requestedAt ? formatDate(r.requestedAt) : "—"}
                  </p>
                  {r.reason && <p className="text-white/40 font-dm text-xs mt-1 italic">"{r.reason}"</p>}
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => resolve(r.id, "approve")}
                      disabled={busyId === r.id}
                      className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 font-dm text-xs px-3 py-2 rounded-lg disabled:opacity-60"
                    >
                      <FiCheck size={13} /> Approve
                    </button>
                    <button
                      onClick={() => resolve(r.id, "reject")}
                      disabled={busyId === r.id}
                      className="flex items-center gap-1.5 text-white/50 hover:text-white border border-white/10 font-dm text-xs px-3 py-2 rounded-lg disabled:opacity-60"
                    >
                      <FiX size={13} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAccountDeletions;
