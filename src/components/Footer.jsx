import React from "react";
import { Link } from "react-router-dom";
import { FiInstagram, FiTwitter, FiFacebook, FiLinkedin } from "react-icons/fi";
import abopayLogo from "../assets/abopay-logo.png";

const Footer = () => (
  <footer className="border-t border-white/8 py-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid md:grid-cols-4 gap-10 mb-12">
        <div className="md:col-span-1">
          <Link to="/" className="flex items-center mb-4">
            <img src={abopayLogo} alt="Abopay" className="h-9 w-auto" />
          </Link>
          <p className="text-white/40 font-dm text-sm leading-relaxed mb-2 italic">
            Pay Easy, Live More
          </p>
          <p className="text-white/40 font-dm text-sm leading-relaxed mb-5">
            Smart payments for every Nigerian. Secure, fast, and always available.
          </p>
          <div className="flex gap-3">
            {[FiInstagram, FiTwitter, FiFacebook, FiLinkedin].map((Icon, i) => (
              <a key={i} href="#" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-secondary hover:border-secondary/30 transition-all">
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>

        {[
          {
            title: "Products",
            links: ["Transfer Money", "Pay Bills", "Buy Airtime", "Savings", "Cards"],
          },
          {
            title: "Company",
            links: ["About Us", "Careers", "Blog", "Press", "Partners"],
          },
          {
            title: "Support",
            links: ["Help Center", "Contact Us", "Privacy Policy", "Terms of Service", "CBN Compliance"],
          },
        ].map((col, i) => (
          <div key={i}>
            <h4 className="font-syne font-semibold text-white text-sm mb-4">{col.title}</h4>
            <ul className="flex flex-col gap-2.5">
              {col.links.map((l, j) => (
                <li key={j}>
                  <a href="#" className="text-white/40 font-dm text-sm hover:text-secondary transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="pt-8 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-white/30 font-dm text-xs">
          © 2025 Abopay. All rights reserved. Licensed by the Central Bank of Nigeria.
        </p>
        <div className="flex items-center gap-4">
          <img src="https://img.shields.io/badge/Paystack-00C3F7?style=flat&logo=paystack&logoColor=white" alt="Paystack" className="h-5 opacity-60" />
          <img src="https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black" alt="Firebase" className="h-5 opacity-60" />
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
