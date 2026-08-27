import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import {
  Home,
  MessageCircleMore,
  Package,
  UserRound,
  Compass,
  PlusCircle,
  Bell,
} from "lucide-react";

import { useAppStore } from "../store/useAppStore";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    isDriverMode,
    toggleDriverMode,
    user
  } = useAppStore();

  return (
    <div className="min-h-screen bg-slate-50 text-syncro-dark font-sans pb-20 md:pb-0 flex flex-col w-full overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 px-4 sm:px-8 py-3 shadow-sm backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link to="/home" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
              S
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                Syncro<span className="text-emerald-500">Go</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                Travel Together • Save Together
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/home"
              className={`text-sm font-bold transition-colors ${
                location.pathname === "/home" ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Home
            </Link>
            <Link
              to="/find-ride"
              className={`text-sm font-bold transition-colors ${
                location.pathname === "/find-ride" ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Find Ride
            </Link>
            <Link
              to="/offer-ride"
              className={`text-sm font-bold transition-colors ${
                location.pathname === "/offer-ride" ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Offer Ride
            </Link>
            <Link
              to="/trips"
              className={`text-sm font-bold transition-colors ${
                location.pathname === "/trips" ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              My Trips
            </Link>
            <Link
              to="/messages"
              className={`text-sm font-bold transition-colors ${
                location.pathname === "/messages" ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Messages
            </Link>
            <Link
              to="/support"
              className={`text-sm font-bold transition-colors ${
                location.pathname === "/support" ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Support
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Passenger / Driver Mode Toggle */}
            <button
              onClick={() => {
                toggleDriverMode();
                navigate("/home");
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-sm border ${
                isDriverMode
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              }`}
            >
              {isDriverMode ? "🚙 Driver Mode" : "🚗 Passenger Mode"}
            </button>

            {/* Notifications */}
            <Link
              to="/notifications"
              className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-colors"
              title="Notifications"
            >
              <Bell size={16} />
            </Link>

            {/* Profile Avatar (Desktop) */}
            <Link
              to="/profile"
              className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 text-slate-700 hover:text-emerald-600 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                {user?.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <span className="text-xs font-bold max-w-[100px] truncate">{user?.name || "Profile"}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 w-full border-t border-slate-200/80 bg-white/95 backdrop-blur-lg px-4 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] z-50">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <NavButton
            icon={<Home size={20} />}
            label="Home"
            active={location.pathname === "/home"}
            onClick={() => navigate("/home")}
          />

          <NavButton
            icon={<Compass size={20} />}
            label="Find Ride"
            active={location.pathname === "/find-ride"}
            onClick={() => navigate("/find-ride")}
          />

          <NavButton
            icon={<PlusCircle size={20} />}
            label="Offer Ride"
            active={location.pathname === "/offer-ride"}
            onClick={() => navigate("/offer-ride")}
          />

          <NavButton
            icon={<Package size={20} />}
            label="Trips"
            active={location.pathname === "/trips"}
            onClick={() => navigate("/trips")}
          />

          <NavButton
            icon={<MessageCircleMore size={20} />}
            label="Messages"
            active={location.pathname === "/messages"}
            onClick={() => navigate("/messages")}
          />

          <NavButton
            icon={<UserRound size={20} />}
            label="Profile"
            active={location.pathname === "/profile"}
            onClick={() => navigate("/profile")}
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors ${
        active ? "text-emerald-600 font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
      }`}
    >
      {icon}
      <span className="text-[10px] leading-none">{label}</span>
    </button>
  );
}