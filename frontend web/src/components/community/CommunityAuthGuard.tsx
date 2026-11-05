import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const CommunityAuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthLoading, openAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      const returnPath = `${location.pathname}${location.search}`;
      openAuth('login', returnPath);
      navigate('/', { replace: true });
    }
  }, [currentUser, isAuthLoading, location.pathname, location.search, navigate, openAuth]);

  if (isAuthLoading || !currentUser) return null;
  return <>{children}</>;
};