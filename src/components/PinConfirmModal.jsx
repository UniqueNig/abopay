import React, { useRef, useState } from "react";
import { FiX, FiLock } from "react-icons/fi";

// 4-digit PIN entry, one box per digit with auto-advance/auto-submit — same
// pattern used for OTP inputs. Reused by every money-out flow (Transfer,
// Bills, Recharge) right before the final API call.
const PinConfirmModal = ({ title = "Enter your PIN", subtitle, onConfirm, onClose, submitting, error }) => {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  const handleChange = (i, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);

    if (digit && i < 3) {
      inputRefs[i + 1].current?.focus();
    } else if (digit && i === 3 && next.every((d) => d !== "")) {
      onConfirm(next.join(""));
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs[i - 1].current?.focus();
    }
  };

  const handleSubmit = () => {
    const pin = digits.join("");
    if (pin.length === 4) onConfirm(pin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xs bg-[#0d2248] border border-white/15 rounded-2xl overflow-hidden shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <FiLock size={15} className="text-secondary" />
            <h3 className="font-syne font-semibold text-white text-base">{title}</h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <FiX size={18} />
          </button>
        </div>
        {subtitle && <p className="text-white/40 font-dm text-xs mb-5">{subtitle}</p>}

        <div className="flex justify-center gap-3 my-6">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
              className="w-12 h-14 text-center text-xl font-syne font-bold bg-white/5 border border-white/15 rounded-xl text-white focus:border-secondary/50 focus:outline-none"
            />
          ))}
        </div>

        {error && <p className="text-red-400 font-dm text-xs text-center mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting || digits.some((d) => !d)}
          className="btn-primary w-full disabled:opacity-60"
        >
          {submitting ? "Confirming..." : "Confirm"}
        </button>
      </div>
    </div>
  );
};

export default PinConfirmModal;
