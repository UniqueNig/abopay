import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { auth } from "../firebase";
import { FiShield, FiCheckCircle, FiAlertCircle, FiUpload } from "react-icons/fi";

const ID_TYPES = ["NIN", "BVN", "Drivers License", "Passport"];
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/+$/, "");

const Kyc = () => {
  const [idType, setIdType] = useState(ID_TYPES[0]);
  const [idNumber, setIdNumber] = useState("");
  const [idImage, setIdImage] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!idNumber.trim() || !idImage || !selfie) {
      setError("Fill in your ID number and attach both photos.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Login required.");
      const idToken = await user.getIdToken();

      const formData = new FormData();
      formData.append("idType", idType);
      formData.append("idNumber", idNumber.trim());
      formData.append("idImage", idImage);
      formData.append("selfie", selfie);

      // Multipart upload — bypasses api.js's JSON-only request() helper.
      const res = await fetch(`${API_URL}/api/kyc/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Submission failed. Try again.");

      setSuccess(true);
    } catch (err) {
      setError(err.message || "Submission failed. Try again.");
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-lg">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-white text-2xl">Identity Verification</h1>
          <p className="text-white/40 font-dm text-sm mt-1">Verify your identity to unlock higher transaction limits</p>
        </div>

        {success ? (
          <div className="card-glass p-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary/15 border border-secondary/20 flex items-center justify-center">
              <FiCheckCircle size={28} className="text-secondary" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-white text-lg mb-1">Submitted for Review</h2>
              <p className="text-white/50 font-dm text-sm">
                Our team will review your documents. This usually takes 24-48 hours.
              </p>
            </div>
          </div>
        ) : (
          <div className="card-glass p-6">
            <div className="flex items-center gap-2 mb-5 text-white/50 font-dm text-xs">
              <FiShield size={14} /> Your documents are stored securely and only visible to our compliance team.
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-4">
                <FiAlertCircle size={15} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 font-dm text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-white/80 font-dm text-sm font-medium mb-2 block">ID Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {ID_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setIdType(t)}
                      className={`py-2.5 rounded-xl font-dm text-sm border transition-all duration-200 ${
                        idType === t
                          ? "bg-secondary/15 border-secondary/40 text-secondary font-semibold"
                          : "bg-white/5 border-white/15 text-white hover:bg-white/10"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/80 font-dm text-sm font-medium mb-2 block">ID Number</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="input-field text-base"
                  placeholder="Enter your ID number"
                  required
                />
              </div>

              <div>
                <label className="text-white/80 font-dm text-sm font-medium mb-2 block">ID Photo</label>
                <label className="flex items-center gap-2 input-field text-base cursor-pointer text-white/60">
                  <FiUpload size={15} />
                  {idImage ? idImage.name : "Choose a clear photo of your ID"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setIdImage(e.target.files?.[0] || null)}
                    className="hidden"
                    required
                  />
                </label>
              </div>

              <div>
                <label className="text-white/80 font-dm text-sm font-medium mb-2 block">Selfie</label>
                <label className="flex items-center gap-2 input-field text-base cursor-pointer text-white/60">
                  <FiUpload size={15} />
                  {selfie ? selfie.name : "Choose a clear selfie"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                    className="hidden"
                    required
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary mt-2 flex items-center justify-center gap-2 py-4 text-base disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit for Verification"}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Kyc;
