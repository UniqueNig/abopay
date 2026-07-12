import React from "react";
import { Navigate, Link } from "react-router-dom";
import { FiShield } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
          <p className="text-white/40 font-dm text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not signed in at all — send to the normal login screen.
  if (!user) return <Navigate to="/login" replace />;

  // Signed in, but this account doesn't carry the admin custom claim.
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-4">
        <div className="card-glass p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <FiShield size={22} className="text-red-400" />
          </div>
          <h1 className="font-syne font-bold text-white text-lg mb-2">Access denied</h1>
          <p className="text-white/40 font-dm text-sm mb-6">
            This account doesn't have admin access. If you believe this is a mistake, ask an
            existing admin to grant your account access.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-secondary text-white font-syne font-bold text-sm px-6 py-3 rounded-xl hover:bg-green-400 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
