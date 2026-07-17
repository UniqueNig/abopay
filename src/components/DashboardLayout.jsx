import React, { useState } from "react";
import { FiMenu } from "react-icons/fi";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import abopayLogo from "../assets/abopay-logo.png";

const DashboardLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-primary overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between gap-3 px-4 h-14 border-b border-white/8 bg-card">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="text-white/60 hover:text-white">
              <FiMenu size={20} />
            </button>
            <img src={abopayLogo} alt="Abopay" className="h-7 w-auto" />
          </div>
          <NotificationBell />
        </div>
        {/* Desktop top strip — just the bell, top-right */}
        <div className="hidden lg:flex items-center justify-end px-6 h-14 border-b border-white/8">
          <NotificationBell />
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
