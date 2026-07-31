import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client'; // Assuming this is your axios instance
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
        // Call the new backend endpoint we just created
        await apiClient.get(`/api/v1/users/verify-email?token=${token}`);
        setStatus('success');
        
        // Automatically redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
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
            <p className="text-sm text-slate-400 mt-4">Redirecting to login...</p>
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