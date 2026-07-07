import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";

const HowItWorks = () => (
  <section id="how" className="py-24 relative">
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/3 to-transparent pointer-events-none" />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <span className="text-secondary font-dm text-sm font-medium tracking-widest uppercase">
          Simple Process
        </span>
        <h2 className="section-title mt-3 mb-4">
          Get Started in <span className="text-gradient">3 Steps</span>
        </h2>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {[
          { step: "01", title: "Create Account", desc: "Sign up with your email, BVN and phone number. Verification takes under 2 minutes.", icon: "👤" },
          { step: "02", title: "Fund Your Wallet", desc: "Add money via bank transfer or card payment. Paystack ensures every kobo is safe.", icon: "💳" },
          { step: "03", title: "Start Banking", desc: "Pay bills, send money, buy airtime, and grow your savings — all from your dashboard.", icon: "🚀" },
        ].map((s, i) => (
          <div key={i} className="relative flex flex-col items-center text-center card-glass p-8">
            <div className="absolute -top-4 left-6 font-syne font-extrabold text-6xl text-white/5 select-none">
              {s.step}
            </div>
            <div className="text-4xl mb-4">{s.icon}</div>
            <h3 className="font-syne font-bold text-white text-lg mb-2">{s.title}</h3>
            <p className="text-white/50 font-dm text-sm leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Security = () => (
  <section id="security" className="py-24">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="card-glass p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10 glow-green">
        <div className="max-w-lg">
          <span className="text-secondary font-dm text-sm font-medium tracking-widest uppercase">Bank-Grade Security</span>
          <h2 className="section-title mt-3 mb-4">
            Your Money is <span className="text-gradient">Safe With Us</span>
          </h2>
          <p className="section-sub mb-6">
            We use 256-bit SSL encryption, two-factor authentication, and real-time fraud
            monitoring to keep your account protected around the clock.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {["256-bit Encryption", "2FA Enabled", "NDIC Insured", "CBN Licensed", "24/7 Monitoring", "Zero Data Breach"].map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-white/60 font-dm text-sm">
                <span className="text-secondary">✓</span> {b}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0 text-center">
          <div className="w-36 h-36 rounded-3xl bg-secondary/10 border border-secondary/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-6xl">🔐</span>
          </div>
          <Link to="/signup" className="btn-primary flex items-center gap-2 w-fit mx-auto">
            Open Account <FiArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  </section>
);

const Home = () => (
  <div className="bg-primary min-h-screen">
    <Navbar />
    <Hero />
    <Features />
    <HowItWorks />
    <Security />
    <Footer />
  </div>
);

export default Home;
