import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiGrid, FiSend, FiFileText, FiSmartphone,
  FiTrendingUp, FiLogOut, FiX, FiPlusCircle,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import abopayLogo from "../assets/abopay-logo.png";

const navItems = [
  { to: "/dashboard", icon: <FiGrid size={17} />, label: "Overview" },
  { to: "/deposit", icon: <FiPlusCircle size={17} />, label: "Deposit", highlight: true },
  { to: "/transfer", icon: <FiSend size={17} />, label: "Transfer" },
  { to: "/bills", icon: <FiFileText size={17} />, label: "Pay Bills" },
  { to: "/recharge", icon: <FiSmartphone size={17} />, label: "Recharge" },
  { to: "/savings", icon: <FiTrendingUp size={17} />, label: "Savings" },
];

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/8">
        <img src={abopayLogo} alt="Abopay" className="h-8 w-auto" />
        {mobileOpen !== undefined && (
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-white/50 hover:text-white">
            <FiX size={18} />
          </button>
        )}
      </div>

      {/* User info */}
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary/15 border border-secondary/20 flex items-center justify-center">
            <span className="text-secondary font-syne font-bold text-sm">
              {user?.displayName?.[0]?.toUpperCase() || "U"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-syne font-semibold text-sm leading-tight truncate">
              {user?.displayName || "User"}
            </p>
            <p className="text-white/40 font-dm text-xs truncate">{user?.email}</p>
          </div>
        </div>
        {/* Balance pill */}
        <div className="mt-3 bg-secondary/8 border border-secondary/15 rounded-xl px-3 py-2 flex items-center justify-between">
          <span className="text-white/45 font-dm text-[11px]">Balance</span>
          <span className="text-secondary font-syne font-bold text-xs">
            ₦{(userData?.balance || 0).toLocaleString("en-NG")}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"}
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl font-dm text-sm transition-all duration-200 ${
                isActive
                  ? "bg-secondary/15 text-secondary border border-secondary/20"
                  : item.highlight
                  ? "text-secondary/70 hover:text-secondary hover:bg-secondary/8 border border-dashed border-secondary/20 hover:border-secondary/40"
                  : "text-white/55 hover:text-white hover:bg-white/5"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/8">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-red-400 hover:bg-red-400/5 font-dm text-sm transition-all duration-200"
        >
          <FiLogOut size={17} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col bg-card border-r border-white/8 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-white/8 z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;
