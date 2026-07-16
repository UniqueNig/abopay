import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { FiAlertTriangle } from "react-icons/fi";

const Settings = () => {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleRequestDeletion = async () => {
    setSubmitting(true);
    setError("");
    try {
      await api.post("/account-deletion-requests", { reason: reason.trim() });
      setSubmitted(true);
      setConfirming(false);
    } catch (err) {
      setError(err.message || "Could not submit request. Try again.");
    }
    setSubmitting(false);
  };

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-lg">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-white text-2xl">Settings</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Account details and preferences</p>
        </div>

        <div className="card-glass p-6 mb-6">
          <p className="text-white/40 font-dm text-xs uppercase tracking-wider mb-1">Name</p>
          <p className="text-white font-dm text-sm mb-4">{user?.displayName || "—"}</p>
          <p className="text-white/40 font-dm text-xs uppercase tracking-wider mb-1">Email</p>
          <p className="text-white font-dm text-sm mb-4">{user?.email}</p>
          <p className="text-white/40 font-dm text-xs uppercase tracking-wider mb-1">Account Number</p>
          <p className="text-white font-dm text-sm">{userData?.accountNumber || "—"}</p>
        </div>

        <div className="card-glass p-6 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <FiAlertTriangle className="text-red-400" size={16} />
            <h2 className="font-syne font-semibold text-white text-sm">Danger Zone</h2>
          </div>

          {submitted ? (
            <p className="text-white/50 font-dm text-sm">
              Your deletion request has been submitted. Our team will review it — this doesn't happen automatically.
            </p>
          ) : confirming ? (
            <div>
              <p className="text-white/50 font-dm text-sm mb-3">
                This queues a request to permanently delete your account and all its data. An admin reviews every
                request before anything is deleted — it doesn't happen immediately.
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input-field min-h-[70px] resize-none text-sm mb-3"
                placeholder="Why are you leaving? (optional)"
              />
              {error && <p className="text-red-400 font-dm text-xs mb-3">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 font-dm text-sm text-white/60 hover:text-white border border-white/10 rounded-xl py-2.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestDeletion}
                  disabled={submitting}
                  className="flex-1 font-dm text-sm font-medium text-red-400 border border-red-500/25 hover:bg-red-500/10 rounded-xl py-2.5 disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Confirm Request"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-white/50 font-dm text-sm mb-4">
                Permanently delete your Abopay account and all associated data.
              </p>
              <button
                onClick={() => setConfirming(true)}
                className="text-red-400 hover:text-red-300 font-dm text-sm font-medium border border-red-500/25 hover:bg-red-500/10 rounded-xl px-4 py-2.5"
              >
                Delete My Account
              </button>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
