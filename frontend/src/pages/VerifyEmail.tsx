import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { primeCurrentUser } from '../api/currentUser';
import { useAppStore } from '../store/useAppStore';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token provided.');
      return;
    }

    const verify = async () => {
      try {
        const res = await apiClient.get(`/api/v1/users/verify-email?token=${token}`);
        setStatus('success');

        const { access_token, user: profile } = res.data || {};
        if (access_token) {
          localStorage.setItem("syncrogo_token", access_token);
          localStorage.setItem("token", access_token);
          if (profile) {
            primeCurrentUser(access_token, profile);
            useAppStore.getState().login({
              id: String(profile.id),
              name: profile.name || profile.full_name || profile.email,
              email: profile.email,
              rating: profile.rating ?? 0,
              role: profile.role,
              profile_photo_url: profile.profile_photo_url,
            });
          }
          const role = profile?.role?.toLowerCase();
          const isAdminOrEmployer = role === "admin" || role === "employer";
          setTimeout(() => {
            navigate(isAdminOrEmployer ? '/admin' : '/home', { replace: true });
          }, 1000);
        } else {
          setTimeout(() => {
            navigate('/home', { replace: true });
          }, 1000);
        }
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error.response?.data?.detail || 'Verification failed. Link may be expired.');
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">

        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader size={48} className="text-indigo-600 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-slate-800">Verifying your email...</h2>
            <p className="text-slate-500 mt-2">Please wait just a moment.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-fade-in">
            <CheckCircle size={64} className="text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800">Email Verified!</h2>
            <p className="text-slate-500 mt-2">Your account is ready to go.</p>
            <p className="text-sm text-slate-400 mt-4">Going to Home page...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-fade-in">
            <XCircle size={64} className="text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800">Verification Failed</h2>
            <p className="text-red-500 mt-2">{errorMessage}</p>
            <Link
              to="/login"
              className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Back to Login
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}