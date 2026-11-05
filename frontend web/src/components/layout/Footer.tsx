import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles } from 'lucide-react';

const FooterNavGroup: React.FC<{ title: string; links: [string, string][] }> = ({ title, links }) => (
  <div>
    <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300 mb-4">{title}</h4>
    <ul className="space-y-2.5 text-sm">
      {links.map(([label, path]) => (
        <li key={path}><Link to={path} className={`transition-colors hover:underline ${path === '/safety#report' ? 'text-amber-400 hover:text-amber-300' : 'hover:text-brand-300'}`}>{label}</Link></li>
      ))}
    </ul>
  </div>
);

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-navy-950 text-slate-400 pt-16 pb-10 border-t border-white/6 overflow-hidden">

      {/* ── Background decoration ── */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-brand-500/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── App Download Highlight ── */}
        <div className="relative mb-10 sm:mb-16 p-5 sm:p-8 lg:p-10 rounded-2xl bg-gradient-to-br from-brand-950 via-slate-900 to-navy-900 border border-brand-500/20 overflow-hidden luminous-border">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-brand-500/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-full h-full mesh-grid opacity-30 pointer-events-none rounded-2xl" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="badge-live mb-3 w-fit">
                <Sparkles className="w-3 h-3" />
                Mobile Experience
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display mb-2">
                Take SyncroGo With You.
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Find and share rides wherever your journey takes you. Route details, booking status, and co-traveler communication — all on mobile.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {/* Google Play */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl glass border border-white/8 text-slate-400 cursor-not-allowed select-none group">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a1.996 1.996 0 0 1-.61-1.42V3.234c0-.555.225-1.059.609-1.42zM15.207 13.414l2.57 2.57-11.458 6.55 8.888-9.12zM15.207 10.586L6.319 1.466 17.777 8.016l-2.57 2.57zm1.414 1.414l3.14-1.795a1.5 1.5 0 0 1 0 2.616l-3.14 1.779z" />
                </svg>
                <div className="text-left">
                  <div className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Android App</div>
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    Google Play
                    <span className="text-[9px] px-1.5 bg-green-500/20 text-green-400 rounded font-semibold border border-green-500/25">Coming Soon</span>
                  </div>
                </div>
              </div>

              {/* App Store */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl glass border border-white/8 text-slate-400 cursor-not-allowed select-none">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.17.65-2.85 1.44-.6.69-1.12 1.8-.98 2.85 1.08.08 2.21-.57 2.82-1.42z" />
                </svg>
                <div className="text-left">
                  <div className="text-[9px] uppercase font-bold tracking-wider text-slate-500">iOS App</div>
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    App Store
                    <span className="text-[9px] px-1.5 bg-brand-500/20 text-brand-400 rounded font-semibold border border-brand-500/25">Coming Soon</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Link Columns (navigation only) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 mb-10 sm:mb-14">

          {/* Brand */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1">
            <Link to="/" aria-label="SyncroGO home" className="inline-flex items-center gap-1.5 mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 via-brand-500 to-green-500 p-0.5">
                <div className="w-full h-full rounded-[7px] bg-navy-950 flex items-center justify-center overflow-hidden">
                  <img src="/logo-icon.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              <span className="text-lg font-black text-white font-display">
                Syncro<span className="text-brand-400">Go</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              India's community-first carpooling and bikepooling network. Your ride, your route, your community.
            </p>
            <div className="flex items-center gap-2 text-xs text-brand-400 bg-brand-500/8 border border-brand-500/18 px-3 py-1.5 rounded-lg w-fit">
              <ShieldCheck className="w-4 h-4" />
              <span>Community-first journeys</span>
            </div>
          </div>

          <FooterNavGroup title="SyncroGo" links={[
            ['Find a Ride', '/find-ride'], ['Offer a Ride', '/offer-ride'], ['Community', '/community'],
            ['How It Works', '/how-it-works'], ['Safety', '/safety'],
          ]} />
          <FooterNavGroup title="Company" links={[
            ['About Us', '/about'], ['Mission & Vision', '/about#mission'], ['Careers', '/help'], ['Contact', '/contact'],
          ]} />
          <FooterNavGroup title="Support" links={[
            ['Help Center', '/help'], ['Safety Guidelines', '/safety'], ['Community Guidelines', '/community'], ['Report a Problem', '/safety#report'],
          ]} />

          {/* Legal */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300 mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                ['Terms & Conditions', '/terms'],
                ['Privacy Policy', '/privacy'],
                ['Cookie Policy', '/cookies'],
                ['Consent Settings', '/consent'],
                ['Grievance & Contact', '/contact'],
              ].map(([label, path]) => (
                <li key={path}><Link to={path} className="transition-colors hover:text-brand-300 hover:underline">{label}</Link></li>
              ))}
              <li><button type="button" onClick={() => window.dispatchEvent(new Event('syncrogo:open-cookie-settings'))} className="text-left transition-colors hover:text-brand-300 hover:underline">Cookie Settings</button></li>
            </ul>
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div className="pt-8 border-t border-white/6 flex flex-col items-center justify-between gap-4 text-xs text-slate-600 sm:flex-row">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:flex-wrap sm:gap-3 sm:text-left">
            <span>© {new Date().getFullYear()} SyncroGo Technologies.</span>
            <span className="text-slate-500">Built for cleaner, connected Indian transit.</span>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-slate-500 text-[10px]">🇮🇳 Made in India</span>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-3">
            {[
              { label: 'Instagram', href: 'https://instagram.com', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
              { label: 'YouTube', href: 'https://youtube.com', path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
              { label: 'LinkedIn', href: 'https://linkedin.com', path: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z' },
              { label: 'X', href: 'https://x.com', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
            ].map(({ label, href, path }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-8 h-8 rounded-lg glass border border-white/8 flex items-center justify-center text-slate-500 hover:text-brand-400 hover:border-brand-500/30 transition-all"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d={path} /></svg>
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
};
