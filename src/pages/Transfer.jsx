import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import PinConfirmModal from "../components/PinConfirmModal";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { BANKS, formatNaira } from "../utils/helpers";
import { FiSend, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { Link, useNavigate, useLocation } from "react-router-dom";

const Transfer = () => {
  const { user, userData, fetchUserData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("bank"); // "bank" | "abopay"
  const [form, setForm] = useState({ bank: "", bankCode: "", accountNumber: "", accountName: "", amount: "", narration: "" });
  const [bankSearch, setBankSearch] = useState("");
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pricing, setPricing] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const balance = userData?.balance ?? 0;
  const isBank = mode === "bank";

  useEffect(() => {
    api.get("/pricing").then((res) => setPricing(res.pricing)).catch(() => {});
  }, []);

  const amt = parseFloat(form.amount) || 0;
  const fee = isBank && pricing ? pricing.transferFeeFlat + amt * (pricing.transferFeePercent / 100) : 0;
  const total = amt + fee;

  const filteredBanks = BANKS.filter((b) =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleModeChange = (next) => {
    setMode(next);
    setForm({ bank: "", bankCode: "", accountNumber: "", accountName: "", amount: "", narration: "" });
    setBankSearch(""); setError(""); setCouponCode("");
  };

  const handleBankSelect = (bank) => {
    setForm((prev) => ({ ...prev, bank: bank.name, bankCode: bank.code, accountName: "" }));
    setBankSearch(bank.name);
    setShowBankDropdown(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    const amt = parseFloat(form.amount);
    if (isBank && !form.bank) return;
    if (!form.accountNumber || !amt) return;
    if (form.accountNumber.length !== 10) { setError("Account number must be 10 digits."); return; }
    if (amt > balance) { setError("Insufficient balance. Please deposit more funds."); return; }
    if (amt < 100) { setError("Minimum transfer amount is ₦100."); return; }

    setVerifying(true);
    try {
      // Resolve the real account holder's name so the user can confirm
      // they're paying the right person before sending money.
      if (isBank) {
        const { accountName } = await api.get(
          `/transfers/resolve-account?accountNumber=${form.accountNumber}&bankCode=${form.bankCode}`
        );
        setForm((p) => ({ ...p, accountName }));
      } else {
        const { fullName } = await api.get(`/wallet-transfers/lookup/${form.accountNumber}`);
        setForm((p) => ({ ...p, accountName: fullName }));
      }
      setStep(2);
    } catch (err) {
      setError(
        err.message ||
          (isBank ? "Could not verify account. Check the account number and bank." : "No Abopay account found with that account number.")
      );
    }
    setVerifying(false);
  };

  const handleConfirmClick = () => {
    if (!userData?.hasPin) {
      navigate("/set-pin", { state: { returnTo: "/transfer" } });
      return;
    }
    setPinError("");
    setShowPinModal(true);
  };

  const handlePinConfirm = async (pin) => {
    setLoading(true);
    setPinError("");
    try {
      const result = isBank
        ? await api.post("/transfers", {
            accountNumber: form.accountNumber,
            bankCode: form.bankCode,
            amount: parseFloat(form.amount),
            narration: form.narration || "Abopay Transfer",
            couponCode: couponCode.trim() || undefined,
            pin,
          })
        : await api.post("/wallet-transfers", {
            accountNumber: form.accountNumber,
            amount: parseFloat(form.amount),
            narration: form.narration || "Wallet Transfer",
            pin,
          });

      await fetchUserData(user.uid);

      if (result.success) {
        setShowPinModal(false);
        setStep(3);
      }
    } catch (err) {
      console.error("Transfer error:", err);
      setPinError(
        err.message?.includes("Insufficient")
          ? "Insufficient balance."
          : err.message?.includes("recipient") || err.message?.includes("Abopay account")
          ? err.message
          : err.message || "Transfer failed. Please try again or contact support."
      );
    }
    setLoading(false);
  };

  const reset = () => {
    setStep(1);
    setForm({ bank: "", bankCode: "", accountNumber: "", accountName: "", amount: "", narration: "" });
    setBankSearch(""); setError(""); setCouponCode("");
  };

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-lg">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-white text-2xl">Send Money</h1>
          <p className="text-white/40 font-dm text-sm mt-1">
            {isBank ? "Transfer to any Nigerian bank account" : "Send instantly to another Abopay user"}
          </p>
        </div>

        {step === 3 ? (
          <div className="card-glass p-10 flex flex-col items-center text-center gap-5">
            <div className="w-20 h-20 rounded-full bg-secondary/15 border-2 border-secondary/30 flex items-center justify-center">
              <FiCheckCircle size={36} className="text-secondary" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-white text-xl mb-2">Transfer {isBank ? "Initiated" : "Sent"}!</h2>
              <p className="text-white/60 font-dm text-sm">
                <span className="text-secondary font-bold">{formatNaira(parseFloat(form.amount))}</span> sent to {form.accountName}{isBank ? ` · ${form.bank}` : ""}
              </p>
              <p className="text-white/35 font-dm text-xs mt-2">
                {isBank ? "Bank transfers typically arrive within minutes." : "Delivered instantly to their Abopay wallet."}
              </p>
            </div>
            <div className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex justify-between">
              <span className="text-white/50 font-dm text-sm">Remaining Balance</span>
              <span className="text-white font-syne font-bold">{formatNaira(userData?.balance ?? 0)}</span>
            </div>
            <button onClick={reset} className="btn-primary w-full">Make Another Transfer</button>
          </div>
        ) : (
          <div className="card-glass p-6">
            {step === 1 && (
              <div className="flex gap-2 mb-6">
                <button type="button" onClick={() => handleModeChange("abopay")}
                  className={`flex-1 py-3 rounded-xl font-dm text-sm font-semibold border transition-all duration-200 ${
                    mode === "abopay" ? "bg-secondary/15 border-secondary/40 text-secondary" : "bg-white/5 border-white/15 text-white/60 hover:text-white"
                  }`}>
                  Abopay Account
                </button>
                <button type="button" onClick={() => handleModeChange("bank")}
                  className={`flex-1 py-3 rounded-xl font-dm text-sm font-semibold border transition-all duration-200 ${
                    mode === "bank" ? "bg-secondary/15 border-secondary/40 text-secondary" : "bg-white/5 border-white/15 text-white/60 hover:text-white"
                  }`}>
                  Other Banks
                </button>
              </div>
            )}

            <div className={`${balance === 0 ? "bg-red-500/8 border-red-500/20" : "bg-sky-400/8 border-sky-400/20"} border rounded-2xl px-5 py-4 mb-6 flex items-center justify-between`}>
              <div>
                <p className="text-white/50 font-dm text-xs uppercase tracking-wider mb-1">Available Balance</p>
                <p className={`font-syne font-bold text-xl ${balance === 0 ? "text-red-400" : "text-sky-400"}`}>{formatNaira(balance)}</p>
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

            {step === 1 && (
              <form onSubmit={handleVerify} className="flex flex-col gap-4">
                {isBank && (
                  <div>
                    <label className="text-white/80 font-dm text-sm font-medium mb-2 block">Destination Bank</label>
                    <div className="relative">
                      <input type="text" value={bankSearch}
                        onChange={(e) => { setBankSearch(e.target.value); setShowBankDropdown(true); setForm(p => ({ ...p, bank: "", bankCode: "" })); }}
                        onFocus={() => setShowBankDropdown(true)}
                        className="input-field text-base" placeholder="Search bank..." autoComplete="off" />
                      {showBankDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0d2248] border border-white/20 rounded-xl overflow-hidden shadow-2xl z-50 max-h-52 overflow-y-auto">
                          {filteredBanks.length > 0 ? filteredBanks.map((b) => (
                            <button key={b.code} type="button" onClick={() => handleBankSelect(b)}
                              className="w-full text-left px-4 py-3 font-dm text-sm text-white hover:bg-secondary/15 hover:text-secondary transition-colors border-b border-white/5 last:border-0">
                              {b.name}
                            </button>
                          )) : (
                            <div className="px-4 py-3 text-white/40 font-dm text-sm">No bank found</div>
                          )}
                        </div>
                      )}
                    </div>
                    {form.bank && <p className="text-secondary font-dm text-xs mt-1.5 ml-1">✓ {form.bank} selected</p>}
                  </div>
                )}

                <div>
                  <label className="text-white/80 font-dm text-sm font-medium mb-2 block">
                    {isBank ? "Account Number" : "Recipient's Abopay Account Number"}
                  </label>
                  <input type="text" value={form.accountNumber} onChange={handleChange("accountNumber")}
                    className="input-field text-base" placeholder={isBank ? "10-digit NUBAN" : "10-digit account number"} maxLength={10} required />
                </div>

                <div>
                  <label className="text-white/80 font-dm text-sm font-medium mb-2 block">Amount (₦)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 font-syne font-bold">₦</span>
                    <input type="number" value={form.amount} onChange={handleChange("amount")}
                      className="input-field pl-9 text-base" placeholder="0.00" min="100" max={balance} required />
                  </div>
                </div>

                <div>
                  <label className="text-white/80 font-dm text-sm font-medium mb-2 block">
                    Narration <span className="text-white/35 font-normal">(optional)</span>
                  </label>
                  <input type="text" value={form.narration} onChange={handleChange("narration")}
                    className="input-field text-base" placeholder="What's this for?" maxLength={50} />
                </div>

                {isBank && (
                  <div>
                    <label className="text-white/80 font-dm text-sm font-medium mb-2 block">
                      Coupon Code <span className="text-white/35 font-normal">(optional)</span>
                    </label>
                    <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
                      className="input-field text-base uppercase" placeholder="Have a code?" maxLength={20} />
                  </div>
                )}

                {isBank && fee > 0 && (
                  <p className="text-white/40 font-dm text-xs -mt-1">Fee: {formatNaira(fee)} · Total: {formatNaira(total)}</p>
                )}

                <button type="submit" disabled={(isBank && !form.bank) || !form.accountNumber || verifying}
                  className="btn-primary flex items-center justify-center gap-2 mt-2 py-4 text-base disabled:opacity-50">
                  <FiSend size={15} /> {verifying ? "Verifying account..." : "Continue"}
                </button>
              </form>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-5">
                <h3 className="font-syne font-semibold text-white text-base">Confirm Transfer</h3>
                <div className="flex flex-col rounded-xl overflow-hidden border border-white/10">
                  {[
                    { label: "Account Name", val: form.accountName, highlight: true },
                    ...(isBank ? [{ label: "Destination Bank", val: form.bank }] : []),
                    { label: isBank ? "Account Number" : "Abopay Account Number", val: form.accountNumber },
                    { label: "Amount", val: formatNaira(amt) },
                    { label: "Fee", val: isBank ? formatNaira(fee) : "Instant & Free" },
                    ...(isBank ? [{ label: "Total", val: formatNaira(total), highlight: true }] : []),
                    { label: "Narration", val: form.narration || (isBank ? "Abopay Transfer" : "Wallet Transfer") },
                  ].map((r, i) => (
                    <div key={i} className={`flex items-center justify-between px-5 py-3.5 ${i % 2 === 0 ? "bg-white/3" : "bg-white/5"}`}>
                      <span className="text-white/50 font-dm text-sm">{r.label}</span>
                      <span className={`font-dm text-sm font-semibold ${r.highlight ? "text-secondary" : "text-white"}`}>{r.val}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => { setStep(1); setError(""); }} className="btn-outline flex-1">Back</button>
                  <button onClick={handleConfirmClick} disabled={loading} className="btn-primary flex-1 disabled:opacity-60">
                    {loading ? "Sending..." : "Confirm & Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {showPinModal && (
          <PinConfirmModal
            title="Confirm Transfer"
            subtitle={`Enter your PIN to send ${formatNaira(parseFloat(form.amount) || 0)}`}
            onConfirm={handlePinConfirm}
            onClose={() => { setShowPinModal(false); setPinError(""); }}
            submitting={loading}
            error={pinError}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Transfer;
