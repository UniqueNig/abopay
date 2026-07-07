import React from "react";
import { FiSend, FiFileText, FiSmartphone, FiTrendingUp, FiShield, FiZap } from "react-icons/fi";

const features = [
  {
    icon: <FiSend size={22} />,
    title: "Instant Transfers",
    desc: "Send money to any Nigerian bank instantly. Interbank transfers processed in seconds, 24/7.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: <FiFileText size={22} />,
    title: "Bill Payments",
    desc: "Pay electricity (EKEDC, AEDC, IKEDC), cable TV, water, and internet bills seamlessly.",
    color: "text-naira",
    bg: "bg-naira/10",
  },
  {
    icon: <FiSmartphone size={22} />,
    title: "Airtime & Data",
    desc: "Recharge MTN, Airtel, Glo, and 9mobile for yourself or anyone else instantly.",
    color: "text-gold",
    bg: "bg-gold/10",
  },
  {
    icon: <FiTrendingUp size={22} />,
    title: "Smart Savings",
    desc: "Set savings goals, lock funds, and earn up to 18% interest per annum.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: <FiShield size={22} />,
    title: "Bank-Grade Security",
    desc: "Your money is protected with 256-bit encryption, 2FA, and biometric authentication.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: <FiZap size={22} />,
    title: "Paystack Powered",
    desc: "Every transaction goes through Paystack — Nigeria's most trusted payment infrastructure.",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
];

const Features = () => (
  <section id="features" className="py-24 relative">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <span className="text-secondary font-dm text-sm font-medium tracking-widest uppercase">
          Everything You Need
        </span>
        <h2 className="section-title mt-3 mb-4">
          One App. All Your<br />
          <span className="text-gradient">Banking Needs</span>
        </h2>
        <p className="section-sub max-w-lg mx-auto">
          NairaBank brings together every financial service Nigerians need daily,
          into one beautifully simple platform.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <div key={i} className="feature-card group">
            <div className={`w-11 h-11 rounded-xl ${f.bg} ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
              {f.icon}
            </div>
            <h3 className="font-syne font-semibold text-white text-base mb-2">{f.title}</h3>
            <p className="font-dm text-white/50 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
