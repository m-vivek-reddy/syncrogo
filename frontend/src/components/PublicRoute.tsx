import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../api/config';

const getFastAPIToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('syncrogo_token') || localStorage.getItem('token');
};

export default function PublicRoute() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(() => Boolean(getFastAPIToken()));

  useEffect(() => {
    const checkSession = async () => {
      const token = getFastAPIToken();
      if (!token) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Invalid session');
        setAuthenticated(true);
      } catch {
        localStorage.removeItem('syncrogo_token');
        localStorage.removeItem('token');
        setAuthenticated(false);
      }
      setLoading(false);
    };

    checkSession();

    window.addEventListener('storage', checkSession);

    return () => {
      window.removeEventListener('storage', checkSession);
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return authenticated ? <Navigate to="/home" replace /> : <Outlet />;
}
