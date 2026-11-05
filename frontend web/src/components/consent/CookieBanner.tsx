import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, Settings2 } from 'lucide-react';
import {
  loadCookieConsent,
  saveCookieConsent,
  type CookieConsent,
} from '../../api/consent';
import {
  CONSENT_COPY,
  POLICY_VERSION,
  EFFECTIVE_DATE,
} from '../../legal/legalContent';

/**
 * Sticky cookie consent banner.
 *
 * Deliberately client-side only: strictly necessary cookies are always active
 * (no banner can disable them), and the optional categories are stored locally
 * because the web app's analytics layer reads the same localStorage value. The
 * banner is not a server round-trip — reopening the site re-checks the stored
 * decision rather than nagging the user on every visit.
 */

const CATEGORY_META = [
  {
    key: 'preferences' as const,
    label: 'Preferences',
    description: 'Remember your language and interface settings.',
  },
  {
    key: 'analytics' as const,
    label: 'Analytics',
    description: 'Help us understand how the Platform is used.',
  },
  {
    key: 'marketing' as const,
    label: 'Marketing',
    description: 'Measure advertising campaigns and limit repeated ads.',
  },
];

type PanelMode = 'closed' | 'banner' | 'details';

export const CookieBanner: React.FC = () => {
  const [mode, setMode] = useState<PanelMode>('closed');
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [pending, setPending] = useState({
    preferences: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = loadCookieConsent();
    setConsent(stored);
    setMode(stored ? 'closed' : 'banner');
    if (stored) {
      setPending({
        preferences: stored.preferences,
        analytics: stored.analytics,
        marketing: stored.marketing,
      });
    }
  }, []);

  useEffect(() => {
    const reopenSettings = () => {
      const stored = loadCookieConsent();
      setConsent(stored);
      setPending({
        preferences: stored?.preferences ?? false,
        analytics: stored?.analytics ?? false,
        marketing: stored?.marketing ?? false,
      });
      setMode("details");
    };
    window.addEventListener("syncrogo:open-cookie-settings", reopenSettings);
    return () => window.removeEventListener("syncrogo:open-cookie-settings", reopenSettings);
  }, []);

  // Re-open when the policy version changes underneath the stored decision.
  useEffect(() => {
    if (consent && consent.policyVersion !== POLICY_VERSION) {
      setMode('banner');
    }
  }, [consent]);

  const commit = (choices: { preferences: boolean; analytics: boolean; marketing: boolean }) => {
    const saved = saveCookieConsent(choices, POLICY_VERSION);
    setConsent(saved);
    setMode('closed');
  };

  const acceptAll = () =>
    commit({ preferences: true, analytics: true, marketing: true });

  const rejectOptional = () =>
    commit({ preferences: false, analytics: false, marketing: false });

  const saveSelected = () => commit(pending);

  const toggle = (key: keyof typeof pending) =>
    setPending((c) => ({ ...c, [key]: !c[key] }));

  if (mode === 'closed') return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 animate-fade-in"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Cookie className="h-4 w-4" />
          </span>

          <div className="min-w-0 flex-1">
            {mode === 'banner' && (
              <>
                <h3 className="text-sm font-extrabold text-navy-800">
                  {CONSENT_COPY.cookies_banner_title}
                </h3>
                <p className="mt-1 text-[12px] leading-5 text-slate-500">
                  {CONSENT_COPY.cookies_banner_body}
                  {CONSENT_COPY.cookies_banner_body_marketing}
                </p>
              </>
            )}

            {mode === 'details' && (
              <>
                <h3 className="text-sm font-extrabold text-navy-800">Cookie settings</h3>
                <p className="mt-1 mb-3 text-[12px] text-slate-500">
                  Choose which optional cookies SyncroGo may use. Strictly necessary
                  cookies are always active because the website does not work
                  without them.
                </p>
                <div className="mb-3 space-y-2">
                  {CATEGORY_META.map((cat) => (
                    <label
                      key={cat.key}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 hover:border-slate-200 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={pending[cat.key]}
                        onChange={() => toggle(cat.key)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-green-600"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-navy-800">{cat.label}</span>
                        <span className="block text-[11px] leading-4 text-slate-500">
                          {cat.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  Policy version {POLICY_VERSION} · Last updated {EFFECTIVE_DATE}
                </p>
              </>
            )}

            {/* Actions */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {mode === 'banner' ? (
                <>
                  <button
                    onClick={acceptAll}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-white transition-all hover:shadow-md"
                    style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)' }}
                  >
                    Accept all
                  </button>
                  <button
                    onClick={rejectOptional}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Reject optional
                  </button>
                  <button
                    onClick={() => setMode('details')}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-green-700 hover:underline"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Cookie settings
                  </button>
                  <Link
                    to="/cookies"
                    className="ml-auto text-[10px] font-semibold text-slate-400 hover:text-slate-600 underline"
                  >
                    Cookie Policy
                  </Link>
                </>
              ) : (
                <>
                  <button
                    onClick={saveSelected}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-white transition-all hover:shadow-md"
                    style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)' }}
                  >
                    Save preferences
                  </button>
                  <button
                    onClick={() => setMode('banner')}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Back
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Close without deciding — banner will return on next visit */}
          <button
            onClick={() => setMode('closed')}
            aria-label="Dismiss for now"
            className="p-1.5 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/** Footer link — opens the full Cookie Policy page. */
export const CookiePolicyLink: React.FC = () => (
  <Link to="/cookies" className="hover:text-brand-400 transition-colors">
    Cookie Policy
  </Link>
);