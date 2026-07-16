import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { formatDate } from "../../utils/helpers";
import { FiShield, FiCheck, FiX, FiAlertCircle, FiUser } from "react-icons/fi";

const STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const STATUS_STYLE = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  verified: "bg-secondary/15 text-secondary border-secondary/25",
  rejected: "bg-red-500/15 text-red-400 border-red-500/25",
};

const ReviewModal = ({ submission, action, onClose, onSubmit, submitting }) => {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="card-glass p-6 w-full max-w-sm">
        <h2 className="font-syne font-bold text-white text-lg mb-1">
          {action === "verified" ? "Approve KYC" : "Reject KYC"}
        </h2>
        <p className="text-white/40 font-dm text-sm mb-5">{submission.fullName || submission.email}</p>
        <div className="mb-4">
          <label className="text-white/60 font-dm text-xs mb-1.5 block">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input-field min-h-[80px] resize-none"
            placeholder={action === "rejected" ? "e.g. ID image is blurry, please resubmit" : "Internal note"}
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 font-dm text-sm text-white/60 hover:text-white border border-white/10 rounded-xl py-2.5">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(note.trim())}
            disabled={submitting}
            className={`flex-1 font-dm text-sm font-medium rounded-xl py-2.5 disabled:opacity-60 ${
              action === "verified" ? "bg-secondary text-primary" : "bg-red-500 text-white"
            }`}
          >
            {submitting ? "Saving..." : action === "verified" ? "Confirm Approve" : "Confirm Reject"}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminKyc = () => {
  const [tab, setTab] = useState("pending");
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState(null); // { submission, action }
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/admin/kyc?status=${tab}`);
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(err.message || "Failed to load KYC submissions.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleReview = async (note) => {
    setSubmitting(true);
    try {
      await api.post(`/admin/kyc/${reviewing.submission.uid}/review`, {
        status: reviewing.action,
        note,
      });
      setReviewing(null);
      load();
    } catch (err) {
      setError(err.message || "Failed to update KYC status.");
    }
    setSubmitting(false);
  };

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="font-syne font-bold text-white text-2xl">KYC Compliance</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Review identity verification submissions</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2 rounded-xl font-dm text-sm whitespace-nowrap border transition-colors ${
                tab === t.value
                  ? "bg-secondary/15 text-secondary border-secondary/25"
                  : "text-white/50 border-white/10 hover:text-white"
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
                Expected endpoint: <code>GET /api/admin/kyc</code>. See <code>ADMIN_SETUP.md</code>.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card-glass p-8 text-center text-white/35 font-dm text-sm">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="card-glass p-10 text-center">
            <FiShield className="text-white/20 mx-auto mb-3" size={28} />
            <p className="text-white/40 font-dm text-sm">No {tab !== "all" ? tab : ""} submissions.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {submissions.map((s) => (
              <div key={s.uid} className="card-glass p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/20 flex items-center justify-center">
                      <FiUser size={16} className="text-secondary" />
                    </div>
                    <div>
                      <Link to={`/admin/users/${s.uid}`} className="text-white font-dm text-sm font-medium hover:text-secondary">
                        {s.fullName || s.email}
                      </Link>
                      <p className="text-white/35 font-dm text-xs">{s.email}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-dm px-2.5 py-1 rounded-full border ${STATUS_STYLE[s.kyc.status] || ""}`}>
                    {s.kyc.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                    <p className="text-white/35 font-dm text-[10px] uppercase tracking-wider mb-0.5">ID Type</p>
                    <p className="text-white font-dm text-sm">{s.kyc.idType || "—"}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                    <p className="text-white/35 font-dm text-[10px] uppercase tracking-wider mb-0.5">ID Number</p>
                    <p className="text-white font-dm text-sm">{s.kyc.idNumber || "—"}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                    <p className="text-white/35 font-dm text-[10px] uppercase tracking-wider mb-0.5">Submitted</p>
                    <p className="text-white font-dm text-sm">{s.kyc.submittedAt ? formatDate(s.kyc.submittedAt) : "—"}</p>
                  </div>
                </div>

                {(s.kyc.idImageUrl || s.kyc.selfieUrl) && (
                  <div className="flex gap-3 mb-4">
                    {s.kyc.idImageUrl && (
                      <a href={s.kyc.idImageUrl} target="_blank" rel="noreferrer" className="text-secondary font-dm text-xs underline">
                        View ID document
                      </a>
                    )}
                    {s.kyc.selfieUrl && (
                      <a href={s.kyc.selfieUrl} target="_blank" rel="noreferrer" className="text-secondary font-dm text-xs underline">
                        View selfie
                      </a>
                    )}
                  </div>
                )}

                {s.kyc.note && (
                  <p className="text-white/40 font-dm text-xs mb-4 italic">Note: {s.kyc.note}</p>
                )}

                {s.kyc.status === "pending" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setReviewing({ submission: s, action: "verified" })}
                      className="flex-1 flex items-center justify-center gap-2 bg-secondary/15 border border-secondary/25 text-secondary hover:bg-secondary/25 font-dm text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                    >
                      <FiCheck size={14} /> Approve
                    </button>
                    <button
                      onClick={() => setReviewing({ submission: s, action: "rejected" })}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 font-dm text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                    >
                      <FiX size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewing && (
        <ReviewModal
          submission={reviewing.submission}
          action={reviewing.action}
          onClose={() => setReviewing(null)}
          onSubmit={handleReview}
          submitting={submitting}
        />
      )}
    </AdminLayout>
  );
};

export default AdminKyc;
