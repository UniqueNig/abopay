import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { RECHARGE_NETWORKS, RECHARGE_AMOUNTS, formatNaira } from "../utils/helpers";
import { FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { Link } from "react-router-dom";

const Recharge = () => {
  const { user, userData, fetchUserData } = useAuth();
  const [network, setNetwork] = useState(null);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [type, setType] = useState("airtime");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const balance = userData?.balance ?? 0;

  const finalAmount = amount === "custom" ? parseFloat(customAmount) : parseFloat(amount);

  const handlePay = async (e) => {
    e.preventDefault();
    setError("");
    if (!network || !phone || !finalAmount) return;
    if (finalAmount > balance) {
      setError("Insufficient balance. Please deposit more funds.");
      return;
    }

    setLoading(true);
    try {
      const path = type === "airtime" ? "/vtu/airtime" : "/vtu/data";

      const payload = type === "airtime"
        ? { network: network.id, phone, amount: finalAmount }
        : { network: network.id, phone, amount: finalAmount, variationCode: `${network.id}-${finalAmount}` };

      await api.post(path, payload);
      await fetchUserData(user.uid);
      setSuccess(true);
    } catch (err) {
      console.error("Recharge error:", err);
      setError(err.message?.includes("Insufficient")
        ? "Insufficient balance. Please deposit more funds."
        : err.message || "Recharge failed. Please try again.");
    }
    setLoading(false);
  };

  const reset = () => {
    setSuccess(false); setNetwork(null); setPhone("");
    setAmount(""); setCustomAmount(""); setError("");
  };

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-lg">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-white text-2xl">Buy Airtime & Data</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Recharge any Nigerian network instantly</p>
        </div>

        {success ? (
          <div className="card-glass p-10 flex flex-col items-center text-center gap-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center border-2"
              style={{ backgroundColor: network?.color + "20", borderColor: network?.color + "50" }}>
              <FiCheckCircle size={36} style={{ color: network?.color }} />
            </div>
            <div>
              <h2 className="font-syne font-bold text-white text-xl mb-2">
                {type === "airtime" ? "Airtime" : "Data"} Delivered!
              </h2>
              <p className="text-white/60 font-dm text-sm">
                <span className="font-bold" style={{ color: network?.color }}>{formatNaira(finalAmount)}</span>{" "}
                {type} sent to {phone} · {network?.label}
              </p>
            </div>
            <div className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex justify-between">
              <span className="text-white/50 font-dm text-sm">Remaining Balance</span>
              <span className="text-white font-syne font-bold">{formatNaira(userData?.balance ?? 0)}</span>
            </div>
            <button onClick={reset} className="btn-primary w-full">Recharge Again</button>
          </div>
        ) : (
          <div className="card-glass p-6">
            {/* Balance */}
            <div className={`${balance === 0 ? "bg-red-500/8 border-red-500/20" : "bg-gold/8 border-gold/20"} border rounded-2xl px-5 py-4 mb-5 flex items-center justify-between`}>
              <div>
                <p className="text-white/50 font-dm text-xs uppercase tracking-wider mb-1">Wallet Balance</p>
                <p className={`font-syne font-bold text-xl ${balance === 0 ? "text-red-400" : "text-gold"}`}>{formatNaira(balance)}</p>
              </div>
              {balance === 0 && (
                <Link to="/deposit" className="text-secondary font-dm text-xs border border-secondary/30 rounded-xl px-3 py-1.5 hover:bg-secondary/10 transition-colors">Add funds →</Link>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-4">
                <FiAlertCircle size={15} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 font-dm text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handlePay} className="flex flex-col gap-5">
              {/* Type */}
              <div>
                <label className="text-white/80 font-dm text-sm font-medium mb-2 block">Type</label>
                <div className="flex gap-2">
                  {["airtime", "data"].map((t) => (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className={`flex-1 py-3 rounded-xl font-dm text-sm font-semibold capitalize transition-all duration-200 border ${
                        type === t ? "bg-gold/15 border-gold/40 text-gold" : "bg-white/5 border-white/15 text-white/60 hover:text-white hover:border-white/25"
                      }`}>
                      {t === "airtime" ? "📱 Airtime" : "📶 Data"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Network */}
              <div>
                <label className="text-white/80 font-dm text-sm font-medium mb-2 block">Select Network</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {RECHARGE_NETWORKS.map((n) => (
                    <button key={n.id} type="button" onClick={() => setNetwork(n)}
                      className={`py-4 px-3 rounded-xl font-syne font-bold text-base border-2 transition-all duration-200 ${
                        network?.id === n.id ? "scale-105" : "border-white/12 bg-white/5 hover:bg-white/10"}`}
                      style={network?.id === n.id
                        ? { color: n.color, borderColor: n.color + "80", backgroundColor: n.color + "15", boxShadow: `0 0 16px ${n.color}25` }
                        : { color: "#ffffff80" }}>
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-white/80 font-dm text-sm font-medium mb-2 block">Phone Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="input-field text-base" placeholder="08012345678" maxLength={11} required />
              </div>

              {/* Amount presets */}
              <div>
                <label className="text-white/80 font-dm text-sm font-medium mb-2 block">Amount (₦)</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {RECHARGE_AMOUNTS.map((a) => (
                    <button key={a} type="button"
                      onClick={() => { setAmount(String(a)); setCustomAmount(""); }}
                      className={`py-3 rounded-xl font-dm text-sm font-semibold border transition-all duration-200 ${
                        amount === String(a)
                          ? "bg-secondary text-white border-secondary shadow-lg shadow-secondary/20"
                          : "bg-white/5 border-white/15 text-white/75 hover:bg-white/10 hover:border-white/25 hover:text-white"
                      }`}>
                      ₦{a.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input type="number" value={customAmount}
                  onChange={(e) => { setCustomAmount(e.target.value); setAmount("custom"); }}
                  className="input-field text-base" placeholder="Or enter custom amount" min="50" />
              </div>

              <button type="submit"
                disabled={loading || !network || !phone || !finalAmount || finalAmount > balance}
                className="btn-primary flex items-center justify-center gap-2 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? "Processing..." : `Pay ${finalAmount ? formatNaira(finalAmount) : ""} from Wallet`}
              </button>

              <p className="text-white/30 font-dm text-xs text-center">
                Delivered instantly via VTpass · Charged from your wallet balance
              </p>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Recharge;
