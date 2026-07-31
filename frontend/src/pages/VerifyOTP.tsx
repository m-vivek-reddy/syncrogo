import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client'; // Adjust path to your axios instance
import { ShieldCheck, ArrowRight, Loader } from 'lucide-react';

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get email passed from Register screen, or default to empty
  const email = location.state?.email || '';
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiClient.post('/api/v1/users/verify-otp', {
        email: email,
        otp: otp,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Verify Your Email</h2>
          <p className="text-sm text-slate-500 mt-1">
            We sent a 6-digit OTP code to <br />
            <span className="font-semibold text-slate-700">{email || 'your email'}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="p-4 bg-green-50 text-green-700 rounded-xl text-center font-medium">
            🎉 Email verified! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Numbers only
                placeholder="000000"
                className="w-full text-center text-3xl tracking-[12px] font-mono py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="animate-spin" size={20} /> : <>Verify & Continue <ArrowRight size={18} /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}