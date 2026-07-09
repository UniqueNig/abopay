import React, { useRef, useState } from "react";
import { FiX, FiShare2, FiDownload, FiArrowUpRight, FiArrowDownLeft } from "react-icons/fi";
import { formatNaira, formatDate, formatTime } from "../utils/helpers";
import abopayLogo from "../assets/abopay-logo.svg";

// Fields already shown elsewhere in the receipt, or internal-only — hidden
// from the generic "extra details" list so it doesn't look redundant/noisy.
const HIDDEN_KEYS = new Set([
  "id", "type", "title", "amount", "date", "category", "reference",
  "recipientCode", "transferStatus", "vtpassTxId",
]);

const LABELS = {
  bank: "Bank", accountName: "Account Name", narration: "Narration",
  network: "Network", phone: "Phone Number", variationCode: "Plan",
  deliveryStatus: "Delivery Status", provider: "Provider", billType: "Bill Type",
  billersCode: "Meter/Card Number", electricityToken: "Electricity Token",
  channel: "Channel", paidAt: "Paid At", recipientAccountNumber: "To Account",
  senderAccountNumber: "From Account", reason: "Reason",
};

const toLabel = (key) => LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

const TransactionDetailModal = ({ transaction, onClose }) => {
  const receiptRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");

  if (!transaction) return null;
  const tx = transaction;

  const extraEntries = Object.entries(tx).filter(
    ([key, val]) => !HIDDEN_KEYS.has(key) && val !== null && val !== undefined && val !== ""
  );

  const captureReceipt = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(receiptRef.current, { backgroundColor: "#0a1a3a", scale: 2 });
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  };

  const handleShare = async () => {
    setSharing(true);
    setShareError("");
    try {
      const blob = await captureReceipt();
      const file = new File([blob], `abopay-receipt-${tx.reference}.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Abopay Receipt", text: tx.title });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `abopay-receipt-${tx.reference}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err.name !== "AbortError") setShareError("Could not generate receipt. Try again.");
    }
    setSharing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#0d2248] border border-white/15 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-syne font-semibold text-white text-base">Transaction Details</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <FiX size={18} />
          </button>
        </div>

        {/* Receipt content — captured as an image for sharing */}
        <div ref={receiptRef} className="bg-[#0a1a3a] p-6">
          <div className="flex items-center justify-center mb-5">
            <img src={abopayLogo} alt="Abopay" className="h-7 w-auto" />
          </div>

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-3">
              {tx.category}
            </div>
            <div className="flex items-center gap-1.5">
              {tx.type === "credit" ? (
                <FiArrowDownLeft size={14} className="text-secondary" />
              ) : (
                <FiArrowUpRight size={14} className="text-red-400" />
              )}
              <span className={`font-syne font-bold text-2xl ${tx.type === "credit" ? "text-secondary" : "text-red-400"}`}>
                {tx.type === "debit" ? "-" : "+"}{formatNaira(tx.amount)}
              </span>
            </div>
            <p className="text-white/60 font-dm text-sm mt-1">{tx.title}</p>
          </div>

          <div className="flex flex-col rounded-xl overflow-hidden border border-white/10">
            {[
              { label: "Date", val: `${formatDate(tx.date)} · ${formatTime(tx.date)}` },
              { label: "Reference", val: tx.reference },
              ...extraEntries.map(([key, val]) => ({ label: toLabel(key), val: String(val) })),
            ].map((r, i) => (
              <div key={i} className={`flex items-center justify-between gap-4 px-4 py-3 ${i % 2 === 0 ? "bg-white/3" : "bg-white/5"}`}>
                <span className="text-white/45 font-dm text-xs shrink-0">{r.label}</span>
                <span className="text-white font-dm text-xs font-medium text-right break-all">{r.val}</span>
              </div>
            ))}
          </div>

          <p className="text-white/25 font-dm text-[10px] text-center mt-5">Powered by Abopay</p>
        </div>

        <div className="p-5 pt-4">
          {shareError && <p className="text-red-400 font-dm text-xs mb-3 text-center">{shareError}</p>}
          <button
            onClick={handleShare}
            disabled={sharing}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {navigator.share ? <FiShare2 size={15} /> : <FiDownload size={15} />}
            {sharing ? "Generating..." : navigator.share ? "Share Receipt" : "Download Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;
