import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { usePaystack } from "../hooks/usePaystack";
import { api } from "../api";
import { formatNaira } from "../utils/helpers";
import { FiPlusCircle, FiCheckCircle, FiZap, FiAlertCircle } from "react-icons/fi";

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

const Deposit = () => {
  const { user, userData, fetchUserData } = useAuth();
  const { initializePayment } = usePaystack();
  const [amount, setAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [depositedAmount, setDepositedAmount] = useState(0);
  const [error, setError] = useState("");
  const balance = userData?.balance ?? 0;

  const finalAmount = selectedPreset || parseFloat(amount) || 0;

  const handlePreset = (val) => { setSelectedPreset(val); setAmount(""); };
  const handleCustomAmount = (val) => { setAmount(val); setSelectedPreset(null); };

  const handleDeposit = (e) => {
    e.preventDefault();
    setError("");
    if (!finalAmount || finalAmount < 100) return;
    setLoading(true);

    initializePayment({
      email: user?.email,
      amount: finalAmount,
      metadata: [
        { display_name: "Transaction Type", variable_name: "type", value: "wallet_deposit" },
        { display_name: "User ID", variable_name: "uid", value: user?.uid },
      ],
      onSuccess: async (res) => {
        try {
          // ✅ Server-side verification — never trust the client callback alone
          await api.post("/deposits/verify", { reference: res.reference });

          // Refresh local state from Firestore after server credits wallet
          await fetchUserData(user.uid);
          setDepositedAmount(finalAmount);
          setSuccess(true);
        } catch (err) {
          console.error("Verification failed:", err);
          setError(
            err.message?.includes("already")
              ? "This payment was already recorded."
              : "Payment received but verification failed. Contact support with ref: " + res.reference
          );
        }
        setLoading(false);
      },
      onClose: () => { setLoading(false); },
    });
  };

  const reset = () => {
    setSuccess(false); setAmount(""); setSelectedPreset(null);
    setDepositedAmount(0); setError("");
  };

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-lg">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-white text-2xl">Deposit Money</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Add funds to your Abopay wallet</p>
        </div>

        {success ? (
          <div className="card-glass p-10 flex flex-col items-center text-center gap-5">
            <div className="w-20 h-20 rounded-full bg-secondary/15 border-2 border-secondary/30 flex items-center justify-center">
              <FiCheckCircle size={36} className="text-secondary" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-white text-xl mb-2">Deposit Successful!</h2>
              <p className="text-white/60 font-dm text-sm">
                <span className="text-secondary font-bold">{formatNaira(depositedAmount)}</span> added to your wallet
              </p>
            </div>
            <div className="w-full bg-secondary/8 border border-secondary/15 rounded-2xl px-6 py-4 flex items-center justify-between">
              <span className="text-white/50 font-dm text-sm">New Balance</span>
              <span className="text-secondary font-syne font-bold text-lg">{formatNaira(userData?.balance ?? 0)}</span>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={reset} className="btn-outline flex-1">Deposit Again</button>
              <a href="/dashboard" className="btn-primary flex-1 text-center">Go to Dashboard</a>
            </div>
          </div>
        ) : (
          <div className="card-glass p-6">
            <div className="bg-secondary/8 border border-secondary/20 rounded-2xl px-5 py-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-white/50 font-dm text-xs uppercase tracking-wider mb-1">Current Balance</p>
                <p className="text-white font-syne font-bold text-xl">{formatNaira(balance)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center">
                <FiZap size={18} className="text-secondary" />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-4">
                <FiAlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 font-dm text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleDeposit} className="flex flex-col gap-5">
              <div>
                <label className="text-white/70 font-dm text-sm font-medium mb-3 block">Select Amount</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button key={amt} type="button" onClick={() => handlePreset(amt)}
                      className={`py-3 px-2 rounded-xl font-dm text-sm font-semibold border transition-all duration-200 ${
                        selectedPreset === amt
                          ? "bg-secondary text-white border-secondary shadow-lg shadow-secondary/20"
                          : "bg-white/5 border-white/15 text-white/75 hover:bg-white/10 hover:border-white/25 hover:text-white"
                      }`}>
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/70 font-dm text-sm font-medium mb-2 block">Or enter custom amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-syne font-bold text-base">₦</span>
                  <input type="number" value={amount} onChange={(e) => handleCustomAmount(e.target.value)}
                    className="input-field pl-9 text-base" placeholder="Enter amount (min ₦100)" min="100" />
                </div>
              </div>

              {finalAmount >= 100 && (
                <div className="bg-white/4 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-white/50 font-dm text-sm">You're depositing</span>
                  <span className="text-white font-syne font-bold text-base">{formatNaira(finalAmount)}</span>
                </div>
              )}

              <button type="submit" disabled={loading || finalAmount < 100}
                className="btn-primary flex items-center justify-center gap-2 text-base py-4 disabled:opacity-50 disabled:cursor-not-allowed">
                <FiPlusCircle size={16} />
                {loading ? "Verifying payment..." : `Deposit ${finalAmount >= 100 ? formatNaira(finalAmount) : ""} via Paystack`}
              </button>
              <p className="text-white/30 font-dm text-xs text-center">
                Secured by Paystack · Verified server-side before crediting
              </p>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Deposit;
