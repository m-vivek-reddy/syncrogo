import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, HelpCircle } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6 text-syncro-dark font-sans">
      {/* Header with Clickable Logo */}
      <header className="flex items-center justify-between py-2">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition-transform">
            S
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">
            Syncro<span className="text-emerald-600">Go</span>
          </span>
        </Link>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </header>

      {/* Main 404 Hero */}
      <main className="flex flex-col items-center text-center max-w-md mx-auto my-auto py-12">
        <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mb-6 text-emerald-600 font-black text-5xl shadow-inner border border-emerald-100">
          404
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
          Route Not Found
        </h1>

        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          The destination or page you are looking for doesn't exist, was moved, or is temporarily unavailable.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            to="/home"
            className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg hover:bg-slate-800 transition-all text-sm"
          >
            <Home size={18} />
            Go to Home
          </Link>

          <Link
            to="/support"
            className="flex-1 flex items-center justify-center gap-2 bg-white text-slate-700 font-bold py-3.5 px-6 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all text-sm shadow-sm"
          >
            <HelpCircle size={18} />
            Help & Support
          </Link>
        </div>
      </main>

      {/* Footer with Dynamic Copyright Year */}
      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200/60">
        <p>© {new Date().getFullYear()} SyncroGo Technologies Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
