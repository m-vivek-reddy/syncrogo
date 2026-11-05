import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';

const inputCls =
  'w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all';
const labelCls = 'block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5';

/** Simple strength read-out; keeps the reset form honest without a dependency. */
const strengthOf = (pw: string) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};

const STRENGTH = [
  { label: 'Too weak', color: '#ef4444' },
  { label: 'Weak', color: '#f97316' },
  { label: 'Fair', color: '#f59e0b' },
  { label: 'Good', color: '#087ee9' },
  { label: 'Strong', color: '#08aa68' },
];

const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    token ? null : 'This password reset link is invalid or incomplete.',
  );

  const score = useMemo(() => strengthOf(password), [password]);
  const strength = STRENGTH[Math.min(score, 4)];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.post('/api/v1/users/reset-password', {
        token,
        new_password: password,
      });
      setSuccessMsg(res.data.message || 'Password updated. You can now sign in.');
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.detail ||
        'Unable to reset your password. Please request a new link.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-soft border border-slate-100 p-8 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md"
            style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)' }}>
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-display font-bold text-navy-900">Create new password</h1>
        </div>

        {successMsg ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-green-50 text-green-700 p-3 rounded-xl text-sm font-semibold border border-green-100">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <a href="/" className="block w-full py-3 text-center font-bold text-sm text-white rounded-xl shadow-md"
              style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)' }}>
              Back to Home
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="flex items-start gap-2 bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold border border-red-100">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className={labelCls} htmlFor="new-password">New password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input id="new-password" type="password" required minLength={8} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters" className={inputCls} />
              </div>
              {password && (
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${(score / 4) * 100}%`, background: strength.color }} />
                  </div>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: strength.color }}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className={labelCls} htmlFor="confirm-password">Confirm new password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input id="confirm-password" type="password" required minLength={8} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password" className={inputCls} />
              </div>
            </div>

            <button type="submit" disabled={loading || !token}
              className="w-full py-3 font-bold text-sm text-white rounded-xl shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)' }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <a href="/" className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-semibold">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </a>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
