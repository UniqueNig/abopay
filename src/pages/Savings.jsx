import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { usePaystack } from "../hooks/usePaystack";
import { SAVINGS_PLANS, formatNaira } from "../utils/helpers";
import { FiTrendingUp, FiLock, FiCheckCircle, FiArrowRight } from "react-icons/fi";

const Savings = () => {
  const { user, userData } = useAuth();
  const { initializePayment } = usePaystack();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const balance = userData?.balance ?? 847520;
  const savingsBalance = userData?.savingsBalance ?? 120000;

  const planColors = {
    flexi: { accent: "#00d4aa", bg: "bg-secondary/10", border: "border-secondary/20", text: "text-secondary" },
    target: { accent: "#f0a500", bg: "bg-gold/10", border: "border-gold/20", text: "text-gold" },
    fixed: { accent: "#ff6b35", bg: "bg-accent/10", border: "border-accent/20", text: "text-accent" },
  };

  const handleSave = (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt < selectedPlan.min) return;
    setLoading(true);
    initializePayment({
      email: user?.email,
      amount: amt,
      metadata: [
        { display_name: "Plan", variable_name: "plan", value: selectedPlan.name },
        { display_name: "Duration", variable_name: "duration", value: selectedPlan.duration },
        { display_name: "Rate", variable_name: "rate", value: selectedPlan.rate },
      ],
      onSuccess: () => { setLoading(false); setSuccess(true); },
      onClose: () => setLoading(false),
    });
  };

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-3xl">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-white text-2xl">Savings</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Grow your money with competitive interest rates</p>
        </div>

        {/* Savings overview */}
        <div className="card-glass p-6 mb-7 glow-gold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-white/50 font-dm text-xs mb-1">Total in Savings</p>
            <p className="font-syne font-bold text-3xl text-gradient-gold">{formatNaira(savingsBalance)}</p>
            <p className="text-gold/70 font-dm text-xs mt-2 flex items-center gap-1">
              <FiTrendingUp size={12} /> Earning ~12% p.a. on average
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1">
            <div className="bg-gold/10 border border-gold/20 rounded-xl px-4 py-2">
              <p className="text-white/40 font-dm text-[10px]">Wallet Balance</p>
              <p className="text-white font-syne font-semibold text-sm">{formatNaira(balance)}</p>
            </div>
          </div>
        </div>

        {success ? (
          <div className="card-glass p-10 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-secondary/15 border border-secondary/20 flex items-center justify-center">
              <FiCheckCircle size={30} className="text-secondary" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-white text-xl mb-2">Savings Added! 🎉</h2>
              <p className="text-white/50 font-dm text-sm">
                {formatNaira(parseFloat(amount))} added to your <strong className="text-white">{selectedPlan?.name}</strong> plan.
                Earning {selectedPlan?.rate} per annum.
              </p>
            </div>
            <button onClick={() => { setSuccess(false); setSelectedPlan(null); setAmount(""); }} className="btn-primary">
              Save More
            </button>
          </div>
        ) : !selectedPlan ? (
          <div>
            <h2 className="font-syne font-semibold text-white text-base mb-4">Choose a Savings Plan</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {SAVINGS_PLANS.map((plan) => {
                const col = planColors[plan.id];
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`card-glass p-6 cursor-pointer hover:scale-[1.02] transition-all duration-200 border ${col.border} hover:${col.bg}`}
                  >
                    <div className={`text-2xl mb-3`}>
                      {plan.id === "flexi" ? "🌊" : plan.id === "target" ? "🎯" : "🔒"}
                    </div>
                    <h3 className={`font-syne font-bold text-base mb-1 ${col.text}`}>{plan.name}</h3>
                    <div className={`inline-flex items-center gap-1 ${col.bg} border ${col.border} rounded-lg px-2 py-0.5 mb-3`}>
                      <FiTrendingUp size={11} className={col.text} />
                      <span className={`font-syne font-bold text-xs ${col.text}`}>{plan.rate} p.a.</span>
                    </div>
                    <p className="text-white/50 font-dm text-xs leading-relaxed mb-3">{plan.description}</p>
                    <div className="flex flex-col gap-1.5 text-xs font-dm text-white/40">
                      <span>⏱ {plan.duration}</span>
                      <span>💰 Min: {formatNaira(plan.min)}</span>
                    </div>
                    <button className={`mt-4 w-full py-2 rounded-xl border ${col.border} ${col.text} font-dm text-xs hover:${col.bg} transition-all flex items-center justify-center gap-1`}>
                      Choose Plan <FiArrowRight size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card-glass p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{selectedPlan.id === "flexi" ? "🌊" : selectedPlan.id === "target" ? "🎯" : "🔒"}</span>
              <div>
                <h2 className="font-syne font-semibold text-white text-base">{selectedPlan.name}</h2>
                <button onClick={() => setSelectedPlan(null)} className="text-secondary font-dm text-xs hover:underline">
                  ← Change plan
                </button>
              </div>
            </div>

            {/* Plan details */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Interest Rate", val: selectedPlan.rate },
                { label: "Duration", val: selectedPlan.duration },
                { label: "Minimum", val: formatNaira(selectedPlan.min) },
              ].map((d, i) => (
                <div key={i} className="bg-white/5 border border-white/8 rounded-xl p-3">
                  <p className="text-white/40 font-dm text-[10px] mb-1">{d.label}</p>
                  <p className="text-white font-syne font-semibold text-sm">{d.val}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="text-white/60 font-dm text-xs mb-1.5 block">
                  Amount to Save (₦) — minimum {formatNaira(selectedPlan.min)}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 font-syne font-bold">₦</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field pl-8"
                    placeholder={selectedPlan.min.toString()}
                    min={selectedPlan.min}
                    required
                  />
                </div>
              </div>

              {amount && parseFloat(amount) >= selectedPlan.min && (
                <div className="bg-secondary/8 border border-secondary/15 rounded-xl px-4 py-3 text-secondary font-dm text-xs">
                  💡 You'll earn approximately {formatNaira((parseFloat(amount) * parseFloat(selectedPlan.rate) / 100))} in interest over a year.
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !amount || parseFloat(amount) < selectedPlan.min}
                className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : <><FiLock size={14} /> Save {amount ? formatNaira(parseFloat(amount)) : ""} via Paystack</>}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Savings;
