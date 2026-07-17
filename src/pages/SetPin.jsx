import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { FiLock, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

const PinField = ({ label, value, onChange }) => (
  <div>
    <label className="text-white/80 font-dm text-sm font-medium mb-2 block">{label}</label>
    <input
      type="password"
      inputMode="numeric"
      maxLength={4}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
      className="input-field text-base tracking-[0.5em] text-center"
      placeholder="••••"
      required
    />
  </div>
);

const SetPin = () => {
  const { userData, fetchUserData, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasPin = !!userData?.hasPin;
  const returnTo = location.state?.returnTo;

  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (pin.length !== 4) { setError("PIN must be exactly 4 digits."); return; }
    if (pin !== confirmPin) { setError("PINs don't match."); return; }
    if (hasPin && currentPin.length !== 4) { setError("Enter your current PIN."); return; }

    setLoading(true);
    try {
      await api.post("/pin/set", hasPin ? { pin, currentPin } : { pin });
      await fetchUserData(user.uid);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Could not set PIN. Try again.");
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-md">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-white text-2xl">
            {hasPin ? "Change Transaction PIN" : "Set Transaction PIN"}
          </h1>
          <p className="text-white/40 font-dm text-sm mt-1">
            {hasPin
              ? "Your 4-digit PIN protects every transfer, bill, and purchase."
              : "Set a 4-digit PIN — required before you can send money or make purchases."}
          </p>
        </div>

        {success ? (
          <div className="card-glass p-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary/15 border border-secondary/20 flex items-center justify-center">
              <FiCheckCircle size={28} className="text-secondary" />
            </div>
            <p className="text-white/60 font-dm text-sm">PIN {hasPin ? "changed" : "set"} successfully.</p>
            <button
              onClick={() => navigate(returnTo || "/dashboard")}
              className="btn-primary w-full"
            >
              {returnTo ? "Continue" : "Back to Dashboard"}
            </button>
          </div>
        ) : (
          <div className="card-glass p-6">
            <div className="flex items-center gap-2 mb-5 text-white/50 font-dm text-xs">
              <FiLock size={14} /> Never share your PIN with anyone, including Abopay staff.
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-4">
                <FiAlertCircle size={15} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 font-dm text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {hasPin && <PinField label="Current PIN" value={currentPin} onChange={setCurrentPin} />}
              <PinField label={hasPin ? "New PIN" : "PIN"} value={pin} onChange={setPin} />
              <PinField label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} />

              <button
                type="submit"
                disabled={loading}
                className="btn-primary mt-2 py-4 text-base disabled:opacity-60"
              >
                {loading ? "Saving..." : hasPin ? "Change PIN" : "Set PIN"}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SetPin;
