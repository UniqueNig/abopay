import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api";
import { formatDate } from "../../utils/helpers";
import { FiUserPlus, FiAlertCircle, FiShield, FiX } from "react-icons/fi";

const AdminAdmins = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/admin/admins");
      setAdmins(data.admins || []);
    } catch (err) {
      setError(err.message || "Failed to load admins.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError("");
    setInviting(true);
    try {
      await api.post("/admin/admins", { email: email.trim() });
      setEmail("");
      load();
    } catch (err) {
      setInviteError(err.message || "Failed to grant admin access.");
    }
    setInviting(false);
  };

  const revoke = async (uid) => {
    if (!window.confirm("Remove admin access for this account?")) return;
    try {
      await api.post(`/admin/admins/${uid}/revoke`, {});
      load();
    } catch (err) {
      setError(err.message || "Failed to revoke admin access.");
    }
  };

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="font-syne font-bold text-white text-2xl">Admin Management</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Grant or revoke admin access to accounts</p>
        </div>

        <div className="card-glass p-5 mb-6">
          <p className="text-white/60 font-dm text-sm mb-3">
            Grant admin access by email. The account must already exist (they need to have signed up first).
          </p>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@abopay.ng"
              className="input-field flex-1"
              required
            />
            <button
              type="submit"
              disabled={inviting}
              className="btn-primary flex items-center gap-2 !w-auto px-5 disabled:opacity-60"
            >
              <FiUserPlus size={15} /> {inviting ? "Granting..." : "Grant"}
            </button>
          </form>
          {inviteError && <p className="text-red-400 font-dm text-xs mt-2">{inviteError}</p>}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <p className="text-red-400 font-dm text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="card-glass p-8 text-center text-white/35 font-dm text-sm">Loading admins...</div>
        ) : (
          <div className="card-glass overflow-hidden">
            {admins.map((a, i) => (
              <div
                key={a.uid}
                className={`flex items-center justify-between p-4 ${i < admins.length - 1 ? "border-b border-white/5" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/20 flex items-center justify-center">
                    <FiShield size={15} className="text-secondary" />
                  </div>
                  <div>
                    <p className="text-white font-dm text-sm font-medium">{a.displayName || a.email}</p>
                    <p className="text-white/35 font-dm text-xs">
                      {a.email} · joined {a.createdAt ? formatDate(a.createdAt) : "—"}
                    </p>
                  </div>
                </div>
                {a.uid !== user?.uid && (
                  <button
                    onClick={() => revoke(a.uid)}
                    className="flex items-center gap-1.5 text-red-400 hover:bg-red-500/10 font-dm text-xs px-3 py-2 rounded-lg"
                  >
                    <FiX size={13} /> Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAdmins;
