import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthModal } from '../components/common/AuthModal';
import { getCurrentUserApi, logoutUser } from '../api/auth';
import type { User } from '../types';

interface AuthContextValue {
  currentUser: User | null;
  isAuthLoading: boolean;
  openAuth: (tab?: 'login' | 'register', redirectTo?: string) => void;
  logout: () => void;
  updateCurrentUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('syncrogo_token') || localStorage.getItem('token');
    if (!token) {
      setIsAuthLoading(false);
      return;
    }

    getCurrentUserApi()
      .then((user) => setCurrentUser(user))
      .finally(() => setIsAuthLoading(false));
  }, []);

  const openAuth = (tab: 'login' | 'register' = 'login', nextPath?: string) => {
    setAuthTab(tab);
    setRedirectTo(nextPath || null);
    setAuthModalOpen(true);
  };

  const logout = () => {
    logoutUser();
    setCurrentUser(null);
    navigate('/');
  };

  const updateCurrentUser = (user: User) => setCurrentUser(user);

  const value = useMemo(() => ({ currentUser, isAuthLoading, openAuth, logout, updateCurrentUser }), [currentUser, isAuthLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authTab}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setAuthModalOpen(false);
          if (redirectTo) {
            const nextPath = redirectTo;
            setRedirectTo(null);
            navigate(nextPath);
          }
        }}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};