import React, { useState } from "react";
import { FiMenu } from "react-icons/fi";
import AdminSidebar from "./AdminSidebar";
import abopayLogo from "../assets/abopay-logo.png";

const AdminLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-primary overflow-hidden">
      <AdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-white/8 bg-card">
          <button onClick={() => setMobileOpen(true)} className="text-white/60 hover:text-white">
            <FiMenu size={20} />
          </button>
          <img src={abopayLogo} alt="Abopay" className="h-7 w-auto" />
          <span className="bg-secondary/15 border border-secondary/25 text-secondary text-[10px] font-syne font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Admin
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
