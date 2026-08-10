import { useNavigate } from "react-router-dom";

export default function HomeHeader() {
  const navigate = useNavigate();

  return (
    <header className="absolute left-4 top-4 z-20">
      <button
        type="button"
        onClick={() => navigate("/home")}
        className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-bold text-slate-900 shadow-lg ring-1 ring-slate-200"
      >
        <span>🚗</span>
        <span>SyncroGo</span>
      </button>
    </header>
  );
}