import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { BILL_TYPES, formatNaira } from "../utils/helpers";
import { FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { Link } from "react-router-dom";

const Bills = () => {
  const { user, userData, fetchUserData } = useAuth();
  const [selectedType, setSelectedType] = useState(null);
  const [form, setForm] = useState({ provider: "", meterNumber: "", amount: "", meterType: "prepaid", phone: "" });
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cablePlans, setCablePlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [cableVerify, setCableVerify] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const balance = userData?.balance ?? 0;
  const isCable = selectedType?.id === "cable";

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  // Prefill from the account's saved phone once, without overriding anything
  // the user has already typed — VTpass requires a phone for bill payments,
  // but it may need to differ from the account's phone (e.g. a family
  // member's meter), so it stays editable rather than locked to the profile.
  useEffect(() => {
    if (userData?.phone && !form.phone) setForm((p) => ({ ...p, phone: userData.phone }));
  }, [userData]);

  // Cable bouquets have fixed VTpass-defined prices/codes — a blank
  // variationCode (the old behavior) is guaranteed to be rejected.
  useEffect(() => {
    if (!isCable || !form.provider) {
      setCablePlans([]);
      setSelectedPlan(null);
      return;
    }
    setPlansLoading(true);
    setPlansError("");
    setSelectedPlan(null);
    api
      .get(`/vtu/cable-plans/${form.provider}`)
      .then((res) => setCablePlans(res?.content?.varations || []))
      .catch(() => setPlansError("Could not load bouquets. Try again."))
      .finally(() => setPlansLoading(false));
  }, [isCable, form.provider]);

  // Confirms the smartcard is a real active subscription and shows the
  // account holder's name before payment — same trust pattern as resolving
  // a bank account name before a transfer.
  useEffect(() => {
    if (!isCable || !form.provider || form.meterNumber.length < 10) {
      setCableVerify(null);
      setVerifyError("");
      return;
    }
    setVerifyLoading(true);
    setVerifyError("");
    setCableVerify(null);
    api
      .get(`/vtu/verify-cable/${form.provider}/${form.meterNumber}`)
      .then((res) => setCableVerify(res))
      .catch(() => setVerifyError("Could not verify this smartcard number."))
      .finally(() => setVerifyLoading(false));
  }, [isCable, form.provider, form.meterNumber]);

  const displayAmount = isCable ? parseFloat(selectedPlan?.variation_amount || 0) : parseFloat(form.amount || 0);

  const handlePay = async (e) => {
    e.preventDefault();
    setError("");
    const amt = isCable ? parseFloat(selectedPlan?.variation_amount || 0) : parseFloat(form.amount);
    if (!amt) return;
    if (!form.phone || form.phone.length < 10) { setError("Enter a valid phone number."); return; }
    if (amt > balance) { setError("Insufficient balance. Please deposit more funds."); return; }

    setLoading(true);
    try {
      const result = await api.post("/vtu/bill", {
        billType: selectedType.id,
        provider: form.provider,
        meterNumber: form.meterNumber,
        smartCardNumber: form.meterNumber,
        amount: amt,
        meterType: form.meterType || "prepaid",
        variationCode: isCable ? selectedPlan?.variation_code : "",
        phone: form.phone,
      });
      await fetchUserData(user.uid);
      setSuccessData(result);
      setPaidAmount(amt);
      setSuccess(true);
    } catch (err) {
      console.error("Bill pay error:", err);
      setError(err.message?.includes("Insufficient")
        ? "Insufficient balance. Please deposit more funds."
        : err.message || "Bill payment failed. Please try again.");
    }
    setLoading(false);
  };

  const reset = () => {
    setSuccess(false); setSuccessData(null); setPaidAmount(0);
    setSelectedType(null); setForm({ provider: "", meterNumber: "", amount: "", meterType: "prepaid", phone: userData?.phone || "" }); setError("");
    setSelectedPlan(null); setCablePlans([]);
    setCableVerify(null); setVerifyError("");
  };

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-2xl">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-white text-2xl">Pay Bills</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Electricity, cable TV, and more — paid from your wallet</p>
        </div>

        {success ? (
          <div className="card-glass p-10 flex flex-col items-center text-center gap-5">
            <div className="w-20 h-20 rounded-full bg-orange-400/15 border-2 border-orange-400/30 flex items-center justify-center">
              <FiCheckCircle size={36} className="text-orange-400" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-white text-xl mb-2">Bill Paid!</h2>
              <p className="text-white/60 font-dm text-sm">
                <span className="text-orange-400 font-bold">{formatNaira(paidAmount)}</span> paid to {form.provider}
              </p>
              {successData?.electricityToken && (
                <div className="mt-3 bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-3">
                  <p className="text-white/50 font-dm text-xs mb-1">Electricity Token</p>
                  <p className="text-secondary font-syne font-bold text-lg tracking-widest">{successData.electricityToken}</p>
                  <p className="text-white/35 font-dm text-xs mt-1">Enter this token on your meter</p>
                </div>
              )}
            </div>
            <div className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex justify-between">
              <span className="text-white/50 font-dm text-sm">Remaining Balance</span>
              <span className="text-white font-syne font-bold">{formatNaira(userData?.balance ?? 0)}</span>
            </div>
            <button onClick={reset} className="btn-primary w-full">Pay Another Bill</button>
          </div>
        ) : (
          <>
            {/* Bill type selector */}
            {!selectedType && (
              <div>
                <h2 className="font-syne font-semibold text-white text-base mb-4">Select Bill Type</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {BILL_TYPES.map((bt) => (
                    <button key={bt.id} onClick={() => setSelectedType(bt)}
                      className="card-glass p-6 flex flex-col items-center gap-4 hover:border-orange-400/40 hover:bg-orange-400/5 transition-all duration-200 group">
                      <span className="text-4xl group-hover:scale-110 transition-transform duration-200">{bt.icon}</span>
                      <span className="text-white font-dm text-sm font-semibold">{bt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedType && (
              <div className="card-glass p-6">
                <div className="flex items-center gap-3 pb-5 mb-5 border-b border-white/8">
                  <span className="text-3xl">{selectedType.icon}</span>
                  <div>
                    <h2 className="font-syne font-semibold text-white text-base">{selectedType.label}</h2>
                    <button onClick={() => { setSelectedType(null); setError(""); }}
                      className="text-secondary font-dm text-xs hover:underline">← Change bill type</button>
                  </div>
                </div>

                {/* Balance */}
                <div className={`${balance === 0 ? "bg-red-500/8 border-red-500/20" : "bg-orange-400/8 border-orange-400/20"} border rounded-2xl px-5 py-4 mb-5 flex items-center justify-between`}>
                  <div>
                    <p className="text-white/50 font-dm text-xs uppercase tracking-wider mb-1">Wallet Balance</p>
                    <p className={`font-syne font-bold text-xl ${balance === 0 ? "text-red-400" : "text-orange-400"}`}>{formatNaira(balance)}</p>
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

                <form onSubmit={handlePay} className="flex flex-col gap-4">
                  {/* Provider buttons */}
                  <div>
                    <label className="text-white/80 font-dm text-sm font-medium mb-2 block">Provider</label>
                    <div className="flex flex-col gap-2">
                      {selectedType.providers.map((p) => (
                        <button key={p} type="button" onClick={() => setForm(prev => ({ ...prev, provider: p }))}
                          className={`flex items-center justify-between px-4 py-3.5 rounded-xl border font-dm text-sm transition-all duration-200 ${
                            form.provider === p
                              ? "bg-orange-400/15 border-orange-400/40 text-orange-400 font-semibold"
                              : "bg-white/5 border-white/15 text-white hover:bg-white/10 hover:border-white/25"
                          }`}>
                          {p} {form.provider === p && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Meter type (electricity only) */}
                  {selectedType.id === "electricity" && (
                    <div>
                      <label className="text-white/80 font-dm text-sm font-medium mb-2 block">Meter Type</label>
                      <div className="flex gap-2">
                        {["prepaid", "postpaid"].map((mt) => (
                          <button key={mt} type="button" onClick={() => setForm(p => ({ ...p, meterType: mt }))}
                            className={`flex-1 py-3 rounded-xl font-dm text-sm font-semibold capitalize border transition-all duration-200 ${
                              form.meterType === mt ? "bg-orange-400/15 border-orange-400/40 text-orange-400" : "bg-white/5 border-white/15 text-white/60 hover:text-white"
                            }`}>
                            {mt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-white/80 font-dm text-sm font-medium mb-2 block">
                      {selectedType.id === "electricity" ? "Meter Number" : selectedType.id === "cable" ? "Smart Card / IUC Number" : "Account / Customer ID"}
                    </label>
                    <input type="text" value={form.meterNumber} onChange={handleChange("meterNumber")}
                      className="input-field text-base" placeholder="Enter your number" required />
                    {isCable && form.meterNumber.length >= 10 && (
                      verifyLoading ? (
                        <p className="text-white/40 font-dm text-xs mt-2">Verifying smartcard...</p>
                      ) : verifyError ? (
                        <p className="text-red-400 font-dm text-xs mt-2">{verifyError}</p>
                      ) : cableVerify?.customerName ? (
                        <div className="bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-2.5 mt-2">
                          <p className="text-white/50 font-dm text-[11px] mb-0.5">Verified Account</p>
                          <p className="text-secondary font-syne font-semibold text-sm">{cableVerify.customerName}</p>
                        </div>
                      ) : null
                    )}
                  </div>

                  <div>
                    <label className="text-white/80 font-dm text-sm font-medium mb-2 block">Phone Number</label>
                    <input type="tel" value={form.phone} onChange={handleChange("phone")}
                      className="input-field text-base" placeholder="08012345678" maxLength={11} required />
                  </div>

                  {isCable ? (
                    <div>
                      <label className="text-white/80 font-dm text-sm font-medium mb-2 block">Select Bouquet</label>
                      {!form.provider ? (
                        <p className="text-white/40 font-dm text-sm">Select a provider first</p>
                      ) : plansLoading ? (
                        <p className="text-white/40 font-dm text-sm">Loading bouquets...</p>
                      ) : plansError ? (
                        <p className="text-red-400 font-dm text-sm">{plansError}</p>
                      ) : cablePlans.length === 0 ? (
                        <p className="text-white/40 font-dm text-sm">No bouquets available for this provider right now.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                          {cablePlans.map((plan) => (
                            <button key={plan.variation_code} type="button"
                              onClick={() => setSelectedPlan(plan)}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl border font-dm text-sm transition-all duration-200 ${
                                selectedPlan?.variation_code === plan.variation_code
                                  ? "bg-orange-400/15 border-orange-400/40 text-orange-400"
                                  : "bg-white/5 border-white/15 text-white hover:bg-white/10 hover:border-white/25"
                              }`}>
                              <span>{plan.name}</span>
                              <span className="font-syne font-bold">{formatNaira(parseFloat(plan.variation_amount))}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="text-white/80 font-dm text-sm font-medium mb-2 block">Amount (₦)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 font-syne font-bold text-base">₦</span>
                        <input type="number" value={form.amount} onChange={handleChange("amount")}
                          className="input-field pl-9 text-base" placeholder="1000" min="500" required />
                      </div>
                    </div>
                  )}

                  <button type="submit" disabled={loading || !form.provider || !form.phone || (isCable && (!selectedPlan || !cableVerify?.customerName))}
                    className="btn-primary mt-2 flex items-center justify-center gap-2 py-4 text-base disabled:opacity-60">
                    {loading ? "Processing..." : `Pay ${displayAmount ? formatNaira(displayAmount) : "Bill"} from Wallet`}
                  </button>

                  <p className="text-white/30 font-dm text-xs text-center">
                    Powered by VTpass · Charged from your wallet balance
                  </p>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Bills;
