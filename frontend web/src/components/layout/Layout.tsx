import React, { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useAuth } from '../../context/AuthContext';
import { CookieBanner } from '../consent/CookieBanner';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, openAuth } = useAuth();
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const scrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = scrollBehavior;
  }, [pathname]);

  return (
    <div className="sg-route-shell min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <Navbar onOpenAuth={(tab) => openAuth(tab)} currentUser={currentUser} />

      <main className="flex-1 w-full">
        {children}
      </main>

      <Footer />
      <CookieBanner />

    </div>
  );
};
