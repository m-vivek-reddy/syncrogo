import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Mail, MapPin, FileText, MessageSquare, Cookie, LoaderCircle,
  CheckCircle2, AlertCircle, ExternalLink, ScrollText,
} from 'lucide-react';
import {
  getConsentApi, updateConsentApi, type ConsentFlag, type ConsentState,
} from '../api/consent';
import { CONSENT_PURPOSES, EFFECTIVE_DATE, POLICY_VERSION } from '../legal/legalContent';
import { useAuth } from '../context/AuthContext';

const ICONS: Record<ConsentFlag, React.ElementType> = {
  terms: ScrollText,
  privacy: ShieldCheck,
  cookies: Cookie,
  marketing_email: Mail,
  location: MapPin,
  documents: FileText,
  sms: MessageSquare,
};

/**
 * Consent Preference Centre.
 *
 * Reflects the server-backed consent flags and writes every change through
 * PUT /users/me/consent so the decision is both audit-trailed and immediately
 * enforced on the backend. Withdrawal is as easy as granting — one toggle.
 */
export const ConsentSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [state, setState] = useState<ConsentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ConsentFlag | null>(null);
  const [flash, setFlash] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getConsentApi();
    setState(res.data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser) void load();
    else setLoading(false);
  }, [currentUser, load]);

  const toggle = async (purpose: ConsentFlag) => {
    if (!state) return;
    const currently = state.consent[purpose];
    setSaving(purpose);
    setFlash(null);
    const res = await updateConsentApi([purpose], !currently, 'consent_page');
    setSaving(null);
    if (res.success && res.data) {
      setState(res.data);
      setFlash({
        type: 'ok',
        message: !currently
          ? 'Consent granted. Your choice has been saved.'
          : 'Consent withdrawn. This takes effect immediately.',
      });
      setTimeout(() => setFlash(null), 4000);
    } else {
      setFlash({ type: 'err', message: res.message || 'Could not save your choice.' });
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-xl px-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
            <ShieldCheck className="mx-auto h-10 w-10 text-green-600" />
            <h1 className="mt-4 font-display text-2xl font-black text-navy-800">
              Your consent settings
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to review and manage what SyncroGo is allowed to do with
              your data.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white"
              style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)' }}
            >
              Back to SyncroGo <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 text-center">
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-green-600" />
        <p className="mt-3 text-sm text-slate-500">Loading your consent settings…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-green-600">
          Privacy & Consent
        </span>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-navy-800 sm:text-4xl">
          Your consent settings
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Choose which processing activities SyncroGo may carry out. Every change
          is recorded with a timestamp, and withdrawal takes effect immediately.
        </p>

        {flash && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${flash.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
              }`}
          >
            {flash.type === 'ok'
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{flash.message}</span>
          </div>
        )}

        {/* Required policies */}
        {state && !state.has_all_required && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <strong>Heads up.</strong> Your account is missing an agreement to the
            Terms & Conditions or the Privacy Policy. You can re-accept either
            below, or withdraw your agreement at any time — withdrawing stops
            further processing but does not delete your account.
          </div>
        )}

        {/* Toggle list */}
        <div className="mt-6 space-y-3">
          {CONSENT_PURPOSES.map((purpose) => {
            const Icon = ICONS[purpose.key as ConsentFlag];
            const on = state?.consent[purpose.key as ConsentFlag] ?? false;
            const isSaving = saving === purpose.key;
            return (
              <div
                key={purpose.key}
                className="flex flex-col sm:flex-row sm:items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-navy-800">{purpose.label}</h3>
                    {purpose.required && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] leading-5 text-slate-500">
                    {purpose.description}
                  </p>
                </div>
                <button
                  onClick={() => toggle(purpose.key as ConsentFlag)}
                  disabled={isSaving}
                  className={`mt-1 shrink-0 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 py-2.5 sm:py-1.5 w-full sm:w-auto ${on
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  {isSaving ? '…' : on ? 'Granted' : 'Withdrawn'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Policy version */}
        {state?.policy_version && (
          <p className="mt-6 text-[10px] text-slate-400">
            You last agreed to policy version <strong>{state.policy_version}</strong>
            {state.recorded_at && (
              <> on {new Date(state.recorded_at).toLocaleString()}</>
            )}
            . Current published version is <strong>{POLICY_VERSION}</strong> (
            {EFFECTIVE_DATE}).
          </p>
        )}

        {/* Links */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { to: '/terms', label: 'Terms & Conditions' },
            { to: '/privacy', label: 'Privacy Policy' },
            { to: '/cookies', label: 'Cookie Policy' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="group flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-navy-800 shadow-card hover:border-green-300 transition-all"
            >
              <FileText className="h-4 w-4 text-slate-400 group-hover:text-green-600" />
              {l.label}
              <ExternalLink className="ml-auto h-3 w-3 text-slate-300 group-hover:text-green-600" />
            </Link>
          ))}
        </div>

        {/* Grievance */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-6 text-slate-500 shadow-card">
          <strong className="text-navy-800">Withdrawal or grievance.</strong> You
          can also withdraw consent or raise a privacy grievance by writing to{' '}
          <a
            href={`mailto:privacy@syncrogo.in`}
            className="font-semibold text-green-700 underline"
          >
            privacy@syncrogo.in
          </a>
          . We may need to verify your identity before acting on a request.
        </div>
      </div>
    </div>
  );
};

export default ConsentSettingsPage;