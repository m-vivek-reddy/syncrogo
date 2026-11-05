import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Car, Bike, ChevronRight, LogIn, LogOut, ArrowRight, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onOpenAuth?: (tab: 'login' | 'register') => void;
  currentUser?: any;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, currentUser }) => {
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { name: 'Home',         path: '/' },
    { name: 'Find a Ride',  path: '/find-ride' },
    { name: 'Offer a Ride', path: '/offer-ride' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Community',    path: '/community' },
    { name: 'Safety',       path: '/safety' },
    { name: 'About Us',     path: '/about' },
    { name: 'Help',         path: '/help' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-all duration-200 ${
        scrolled ? 'shadow-[0_2px_16px_rgba(11,53,100,0.10)] border-b border-slate-100' : 'border-b border-slate-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px]">

          {/* ── Brand ── */}
          <Link
            to="/"
            aria-label="SyncroGO home"
            className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl p-1"
          >
            <div className="w-11 h-11 flex items-center justify-center group-hover:scale-105 transition-transform">
              <img src="/logo-icon.png" alt="SyncroGo logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-[1.15rem] font-black tracking-tight text-navy-800 font-display">
              Syncro<span className="text-green-600">GO</span>
            </span>
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`relative px-3 py-2 text-[0.8rem] font-semibold rounded-lg transition-all duration-150 ${
                    active
                      ? 'text-green-700 bg-green-50'
                      : 'text-slate-600 hover:text-navy-800 hover:bg-slate-50'
                  }`}
                >
                  {link.name}
                  {active && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-0.5 rounded-full bg-green-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── Right buttons ── */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/find-ride"
              aria-label="Search rides"
              className="p-2 rounded-xl text-slate-600 hover:text-navy-800 hover:bg-slate-100 transition-colors"
            >
              <Search className="w-4.5 h-4.5" />
            </Link>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/community"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-colors"
                >
                  <div className="relative w-7 h-7 overflow-hidden rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-xs">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    {(currentUser.profile_photo || currentUser.profile_photo_url) && <img src={currentUser.profile_photo || currentUser.profile_photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                  </div>
                  <span>{currentUser.name || 'Member'}</span>
                </Link>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-slate-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth && onOpenAuth('login')}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-navy-800 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <LogIn className="w-4 h-4 text-slate-400" />
                  Login
                </button>
                <button
                  onClick={() => onOpenAuth && onOpenAuth('register')}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all group"
                  style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)', boxShadow: '0 4px 14px rgba(7,126,233,0.3)' }}
                >
                  Get Started
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </>
            )}
          </div>

          {/* ── Mobile buttons ── */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => onOpenAuth && onOpenAuth('register')}
              className="px-3.5 py-1.5 text-xs font-bold text-white rounded-lg"
              style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)' }}
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-1.5 animate-slide-up">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Link
              to="/find-ride"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 text-blue-800 font-semibold text-sm border border-blue-100"
            >
              <Car className="w-4 h-4 text-blue-600" />
              Find a Ride
            </Link>
            <Link
              to="/offer-ride"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-3 rounded-xl bg-green-50 text-green-900 font-semibold text-sm border border-green-100"
            >
              <Bike className="w-4 h-4 text-green-600" />
              Offer a Ride
            </Link>
          </div>

          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active ? 'text-green-700 bg-green-50' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{link.name}</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {currentUser ? (
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="w-full py-2.5 text-center text-sm font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({currentUser.name})</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setMobileMenuOpen(false); if (onOpenAuth) onOpenAuth('login'); }}
                  className="w-full py-2.5 text-center text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); if (onOpenAuth) onOpenAuth('register'); }}
                  className="w-full py-2.5 text-center text-sm font-bold text-white rounded-xl"
                  style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)' }}
                >
                  Join SyncroGo Community
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
