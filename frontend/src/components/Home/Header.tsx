import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";

export default function HomeHeader() {
  const navigate = useNavigate();
  const { isDriverMode, toggleDriverMode } = useAppStore();

  return (
    <header className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between pointer-events-auto">
      <button
        type="button"
        onClick={() => navigate("/home")}
        className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-bold text-slate-900 shadow-lg ring-1 ring-slate-200"
      >
        <span>🚗</span>
        <span>SyncroGo</span>
      </button>

      <button
        type="button"
        onClick={toggleDriverMode}
        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-lg ring-1 transition-all ${
          isDriverMode
            ? "bg-emerald-500 text-white ring-emerald-600 shadow-emerald-200 hover:bg-emerald-600"
            : "bg-blue-600 text-white ring-blue-700 shadow-blue-200 hover:bg-blue-700"
        }`}
      >
        <span>{isDriverMode ? "🚙" : "🚗"}</span>
        <span>{isDriverMode ? "Driver Mode" : "Passenger Mode"}</span>
      </button>
    </header>
  );
}