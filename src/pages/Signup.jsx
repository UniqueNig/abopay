import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiUser, FiMail, FiLock, FiPhone, FiArrowRight, FiEye, FiEyeOff } from "react-icons/fi";
import abopayLogo from "../assets/abopay-logo.svg";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

const Signup = () => {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await signup(form.email, form.password, form.fullName, form.phone);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to create account. Try again.");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Google sign-up failed. Please try again.");
      }
    }
    setGoogleLoading(false);
  };

  const fields = [
    { icon: <FiUser size={15} />, label: "Full Name", type: "text", key: "fullName", placeholder: "John Doe" },
    { icon: <FiMail size={15} />, label: "Email Address", type: "email", key: "email", placeholder: "you@example.com" },
    { icon: <FiPhone size={15} />, label: "Phone Number", type: "tel", key: "phone", placeholder: "08012345678" },
  ];

  return (
    <div className="min-h-screen bg-primary mesh-bg flex items-center justify-center px-4 py-12">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent" />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-6">
            <img src={abopayLogo} alt="Abopay" className="h-10 w-auto" />
          </Link>
          <h1 className="font-syne font-bold text-2xl text-white mb-2">Create your account</h1>
          <p className="text-white/50 font-dm text-sm">Free forever. No hidden charges.</p>
        </div>

        <div className="card-glass p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 text-red-400 font-dm text-sm">
              {error}
            </div>
          )}

          {/* Google Sign-Up */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/25 text-white font-dm text-sm font-medium px-4 py-3 rounded-xl transition-all duration-200 mb-5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            {googleLoading ? "Signing up with Google..." : "Continue with Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 font-dm text-xs">or sign up with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="text-white/60 font-dm text-xs mb-1.5 block">{f.label}</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">{f.icon}</span>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={handleChange(f.key)}
                    className="input-field pl-10"
                    placeholder={f.placeholder}
                    required
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="text-white/60 font-dm text-xs mb-1.5 block">Password</label>
              <div className="relative">
                <FiLock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange("password")}
                  className="input-field pl-10 pr-10"
                  placeholder="Minimum 6 characters"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-white/60 font-dm text-xs mb-1.5 block">Confirm Password</label>
              <div className="relative">
                <FiLock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="password"
                  value={form.confirm}
                  onChange={handleChange("confirm")}
                  className="input-field pl-10"
                  placeholder="Repeat password"
                  required
                />
              </div>
            </div>

            <p className="text-white/30 font-dm text-xs">
              By creating an account, you agree to our{" "}
              <a href="#" className="text-secondary hover:underline">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="text-secondary hover:underline">Privacy Policy</a>.
            </p>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-primary flex items-center justify-center gap-2 mt-1 disabled:opacity-60"
            >
              {loading ? "Creating account..." : <>Create Account <FiArrowRight size={14} /></>}
            </button>
          </form>

          <p className="text-center text-white/40 font-dm text-sm mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-secondary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
