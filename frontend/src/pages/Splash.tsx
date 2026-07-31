import { useNavigate } from "react-router-dom";
import sycrologowhite from "../assets/sycrogo white.png";

export default function Splash() {
  const navigate = useNavigate();

  return (
    <div className="relative flex flex-col justify-between min-h-screen overflow-hidden bg-gradient-to-b from-[#08111F] via-[#0F172A] to-[#111827] text-white">

      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-green-500/10 rounded-full blur-[120px]" />
      </div>

            {/* Logo Section */}
<div className="flex flex-1 items-center justify-center z-10 px-6">
  <img
    src={sycrologowhite}
    alt="SyncroGo"
    className="w-full max-w-[560px] object-contain drop-shadow-2xl"
  />
</div>
      {/* Bottom Buttons */}
      <div className="z-10 px-6 pb-10 -mt-16 w-full max-w-md mx-auto space-y-4">

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
          Login
        </button>

      </div>

    </div>
  );
}