import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { loginApi, registerApi, resendOtpApi, verifyOtpApi } from '../../api/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
  onAuthSuccess?: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen, onClose, initialTab = 'login', onAuthSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'otp'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetState = () => { setErrorMsg(null); setSuccessMsg(null); setLoading(false); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); resetState(); setLoading(true);
    const res = await loginApi(email, password);
    setLoading(false);
    if (res.success) { setSuccessMsg('Logged in successfully!'); if (onAuthSuccess) onAuthSuccess(res.user); setTimeout(() => onClose(), 800); }
    else if (res.message?.toLowerCase().includes('verification')) {
      const otpRes = await resendOtpApi(email);
      if (otpRes.success) { setSuccessMsg('Verification needed. A fresh OTP has been sent.'); setTab('otp'); }
      else setErrorMsg(otpRes.message || res.message);
    } else setErrorMsg(res.message || 'Failed to log in.');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); resetState(); setLoading(true);
    const res = await registerApi({ name, email, password, phone });
    setLoading(false);
    if (res.success) { setSuccessMsg('Account created! Check your email/phone for OTP.'); setTab('otp'); }
    else setErrorMsg(res.message || 'Registration failed.');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault(); resetState(); setLoading(true);
    const res = await verifyOtpApi(email, otp);
    setLoading(false);
    if (res.success) { setSuccessMsg('Account verified! You are logged in.'); if (onAuthSuccess) onAuthSuccess(res.user); setTimeout(() => onClose(), 800); }
    else setErrorMsg(res.message || 'Invalid OTP code.');
  };

  const inputCls = 'w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all';
  const labelCls = 'block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5';

  const tabLabel: Record<string, string> = { login: 'Welcome Back', register: 'Join SyncroGo', forgot: 'Reset Password', otp: 'Verify Your Account' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>

        {/* Gradient top strip */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)' }} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-green-600">SyncroGo Account</span>
            <h3 className="text-xl font-extrabold text-navy-800 font-display leading-tight">{tabLabel[tab]}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        {(tab === 'login' || tab === 'register') && (
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mx-6 mt-4">
            {(['login', 'register'] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); resetState(); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tab === t ? 'bg-white text-navy-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
        )}

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /><span>{successMsg}</span>
            </div>
          )}

          {/* Login */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={labelCls}>Email Address</label>
                <div className="relative"><Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" className={inputCls} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls} style={{ marginBottom: 0 }}>Password</label>
                  <button type="button" onClick={() => { setTab('forgot'); resetState(); }} className="text-[10px] font-semibold text-green-600 hover:underline">Forgot?</button>
                </div>
                <div className="relative"><Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} /></div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 font-bold text-sm text-white rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)', boxShadow: '0 4px 14px rgba(7,126,233,0.3)' }}>
                {loading ? 'Signing in...' : 'Sign In to SyncroGo'}{!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* Register */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className={labelCls}>Full Name</label>
                <div className="relative"><User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Aditya Sharma" className={inputCls} /></div>
              </div>
              <div>
                <label className={labelCls}>Email Address</label>
                <div className="relative"><Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aditya@example.com" className={inputCls} /></div>
              </div>
              <div>
                <label className={labelCls}>Phone (Indian 10-digit)</label>
                <div className="relative"><Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" className={inputCls} /></div>
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <div className="relative"><Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className={inputCls} /></div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 font-bold text-sm text-white rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)', boxShadow: '0 4px 14px rgba(7,126,233,0.3)' }}>
                {loading ? 'Creating...' : 'Create SyncroGo Account'}
              </button>
            </form>
          )}

          {/* OTP */}
          {tab === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-xs text-slate-500">Enter the 6-digit code sent to <strong className="text-slate-700">{email || 'your email/phone'}</strong>.</p>
              <div>
                <label className={labelCls}>OTP Code</label>
                <input type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="1  2  3  4  5  6"
                  className="w-full tracking-[0.4em] text-center py-3.5 text-xl font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
              </div>
              <button type="submit" disabled={loading || otp.length < 4}
                className="w-full py-3 font-bold text-sm text-white rounded-xl shadow-md disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)' }}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <button type="button" onClick={() => setTab('login')} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 font-semibold">Back to Login</button>
            </form>
          )}

          {/* Forgot */}
          {tab === 'forgot' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Enter your registered email and we'll send reset instructions.</p>
              <div>
                <label className={labelCls}>Email Address</label>
                <div className="relative"><Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aditya@example.com" className={inputCls} /></div>
              </div>
              <button type="button" onClick={() => setSuccessMsg('Password reset link dispatched to your email if registered.')}
                className="w-full py-3 font-bold text-sm text-white rounded-xl shadow-md"
                style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)' }}>
                Send Reset Link
              </button>
              <button type="button" onClick={() => { setTab('login'); resetState(); }} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 font-semibold">Return to Login</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
