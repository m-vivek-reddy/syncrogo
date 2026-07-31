import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function Profile() {
  const navigate = useNavigate();
  // Grab both the mode and the user data from Zustand
  const { isDriverMode, user, logout } = useAppStore();

  const handleLogout = () => {
    localStorage.removeItem('syncrogo_token');
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-3xl font-poppins font-bold text-syncro-dark mb-6">
        Profile
      </h1>

      {/* User Header Card */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 mb-6">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-4xl mb-2 relative">
          🧑
          <div className="absolute bottom-0 right-0 bg-syncro-blue text-white p-1 rounded-full border-2 border-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
        
        {/* Dynamic Name and Rating */}
        <h2 className="text-2xl font-bold text-syncro-dark">{user?.name || 'Vivek'}</h2>
        <div className="flex items-center gap-1 text-gray-500 font-medium">
          <span className="text-yellow-400 text-lg">★</span> {user?.rating || 4.9} Rating
        </div>
        <div className="bg-green-50 text-syncro-green px-3 py-1 rounded-full text-xs font-bold mt-2">
          Identity Verified
        </div>
      </div>

      {/* Profile Options List */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 mb-6">
        <Link
          to="/account"
          className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition"
        >
          <div className="flex items-center space-x-3">
            <span className="text-xl">💳</span>
            <span className="text-sm font-medium text-slate-800">Account Details</span>
          </div>
          <span className="text-slate-400">›</span>
        </Link>

        <Link
          to="/payments"
          className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition"
        >
          <div className="flex items-center space-x-3">
            <span className="text-xl">💳</span>
            <span className="text-sm font-medium text-slate-800">Payment Methods</span>
          </div>
          <span className="text-slate-400">›</span>
        </Link>

        <Link
          to="/documents"
          className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition"
        >
          <div className="flex items-center space-x-3">
            <span className="text-xl">📄</span>
            <span className="text-sm font-medium text-slate-800">Documents</span>
          </div>
          <span className="text-slate-400">›</span>
        </Link>

        {isDriverMode && (
          <Link
            to="/vehicles"
            className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition"
          >
            <div className="flex items-center space-x-3">
              <span className="text-xl">🚗</span>
              <span className="text-sm font-medium text-slate-800">My Vehicles</span>
            </div>
            <span className="text-slate-400">›</span>
          </Link>
        )}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full bg-red-50 text-red-500 font-bold py-4 rounded-2xl border border-red-100 hover:bg-red-100 transition-colors text-lg"
      >
        Log Out
      </button>
    </div>
  );
}
