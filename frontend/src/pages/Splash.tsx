import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import sycrologowhite from "../assets/sycrogo white.png";

export default function Splash() {
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("syncrogo_token") || localStorage.getItem("token");
    if (token) {
      const userStr = localStorage.getItem("syncrogo_user") || localStorage.getItem("user");
      try {
        const u = userStr ? JSON.parse(userStr) : null;
        const role = (u?.role || "").toLowerCase();
        if (["admin", "administrator", "employer"].includes(role)) {
          navigate("/admin", { replace: true });
          return;
        }
      } catch {}
      navigate("/home", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="relative flex flex-col justify-between min-h-screen overflow-hidden bg-gradient-to-b from-[#08111F] via-[#0F172A] to-[#111827] text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-green-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Logo Section */}
      <div className="flex flex-1 items-center justify-center z-10 px-6">
        {!logoError ? (
          <img
            src={sycrologowhite}
            alt="SyncroGo"
            onError={() => setLogoError(true)}
            className="w-full max-w-[340px] sm:max-w-[440px] object-contain drop-shadow-2xl"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-emerald-400 flex items-center justify-center shadow-2xl">
              <span className="text-4xl font-black text-white">S</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Syncro<span className="text-emerald-400">Go</span>
            </h1>
            <p className="text-xs sm:text-sm font-semibold tracking-widest uppercase text-slate-400">
              Travel Together • Save Together
            </p>
          </div>
        )}
      </div>

      {/* Bottom Buttons & Footer */}
      <div className="z-10 px-6 pb-6 w-full max-w-md mx-auto space-y-3">
        <button
          onClick={() => navigate("/register")}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-green-500 text-white font-bold text-lg shadow-xl hover:scale-[1.02] transition-all duration-300"
        >
          Get Started
        </button>

        <button
          onClick={() => navigate("/login")}
          className="w-full py-4 rounded-2xl border border-white/20 bg-white/5 backdrop-blur-md text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300"
        >
          Sign In
        </button>

        <p className="text-center text-[11px] text-slate-400/80 pt-2">
          © {new Date().getFullYear()} SyncroGo Technologies Inc.
        </p>
      </div>
    </div>
  );
}