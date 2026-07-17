import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { formatDate } from "../../utils/helpers";
import { FiAlertCircle, FiKey, FiCheck, FiX } from "react-icons/fi";

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const AdminPinRequests = () => {
  const [tab, setTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/admin/pin-requests?status=${tab}`);
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message || "Failed to load requests.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const resolve = async (id, action) => {
    try {
      await api.post(`/admin/pin-requests/${id}/resolve`, { action });
      load();
    } catch (err) {
      setError(err.message || "Failed to process request.");
    }
  };

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="font-syne font-bold text-white text-2xl">PIN Management</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Transaction PIN reset requests</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)} className={`px-4 py-2 rounded-xl font-dm text-sm whitespace-nowrap border transition-colors ${tab === t.value ? "bg-secondary/15 text-secondary border-secondary/25" : "text-white/50 border-white/10 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 mb-6">
          <p className="text-yellow-400 font-dm text-xs">
            There's no transaction-PIN feature in the app yet — this queue is ready for when it ships,
            but it'll stay empty until then. See ADMIN_SETUP.md.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <p className="text-red-400 font-dm text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="card-glass p-8 text-center text-white/35 font-dm text-sm">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="card-glass p-10 text-center">
            <FiKey className="text-white/20 mx-auto mb-3" size={28} />
            <p className="text-white/40 font-dm text-sm">No {tab !== "all" ? tab : ""} requests.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((r) => (
              <div key={r.id} className="card-glass p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link to={`/admin/users/${r.uid}`} className="text-white font-dm text-sm font-medium hover:text-secondary truncate block">{r.email || r.uid}</Link>
                  <p className="text-white/35 font-dm text-xs mt-1">Requested {r.requestedAt ? formatDate(r.requestedAt) : "—"}</p>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => resolve(r.id, "approve")} className="flex items-center gap-1.5 bg-secondary/15 border border-secondary/25 text-secondary hover:bg-secondary/25 font-dm text-xs px-3 py-2 rounded-lg"><FiCheck size={13} /> Approve</button>
                    <button onClick={() => resolve(r.id, "reject")} className="flex items-center gap-1.5 text-white/50 hover:text-white border border-white/10 font-dm text-xs px-3 py-2 rounded-lg"><FiX size={13} /> Reject</button>
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

export default AdminPinRequests;
