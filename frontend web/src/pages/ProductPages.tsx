import React, { useState } from 'react';
import { ChevronDown, CircleHelp, HeartHandshake, LockKeyhole, MessageCircle, ShieldCheck, Users, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RhythmSection } from '../components/home/RhythmSection';

type ProductPageKind = 'how' | 'safety' | 'about' | 'help';

const content: Record<ProductPageKind, { eyebrow: string; title: string; description: string; items: { title: string; body: string; icon: React.ElementType }[] }> = {
  how: { eyebrow: 'The SyncroGo rhythm', title: 'A simpler way to share your commute.', description: 'Set a route, find a compatible journey, and keep the conversation in one place.', items: [
    { title: 'Passengers',        body: 'Search a route, review driver details, then send a booking request.',              icon: Users },
    { title: 'Drivers',           body: 'Publish your route with coordinates, seats, timing, and preferences.',             icon: ShieldCheck },
    { title: 'Match and connect', body: 'Route matching brings compatible rides together. Messages keep the handoff clear.', icon: MessageCircle },
    { title: 'Complete and rate', body: 'After the journey, use the ratings workflow to help the community decide better.',  icon: HeartHandshake },
  ] },
  safety: { eyebrow: 'Trust is a product feature', title: 'Safety starts before every ride.', description: 'SyncroGo is designed to make identity, ride context, and reporting easier to understand.', items: [
    { title: 'Identity and documents', body: 'Driver offers are gated by backend document verification. Never share OTPs.',    icon: LockKeyhole },
    { title: 'Ratings and context',    body: 'Review the rating and vehicle information before making a ride request.',         icon: ShieldCheck },
    { title: 'Report a problem',       body: 'Use the community report action for unsafe conduct, harassment, or spam.',        icon: CircleHelp },
    { title: 'Meet responsibly',       body: 'Choose public pickup points, follow traffic laws, keep information private.',     icon: HeartHandshake },
  ] },
  about: { eyebrow: 'Why SyncroGo exists', title: 'Moving people together.', description: 'SyncroGo is building a more affordable, connected way to share everyday journeys across India.', items: [
    { title: 'Mission',            body: 'Make daily commuting easier to share without losing clarity, agency, or trust.', icon: HeartHandshake },
    { title: 'Shared mobility',    body: 'Carpooling and bikepooling help people make better use of existing journeys.',   icon: Users },
    { title: 'Community',          body: 'Routes become more useful when commuters can exchange updates and local tips.',   icon: MessageCircle },
    { title: 'Responsible growth', body: 'Real usage and verified product capabilities define what comes next.',            icon: ShieldCheck },
  ] },
  help: { eyebrow: 'Need a hand?', title: 'Help for your next journey.', description: 'Find answers about rides, accounts, payments, safety, and community.', items: [
    { title: 'Rides',     body: 'Search queries the SyncroGo ride API. Empty results mean no matching backend rides.',     icon: Users },
    { title: 'Drivers',   body: 'Offering a ride requires an authenticated account and approved driver documents.',        icon: ShieldCheck },
    { title: 'Payments',  body: 'Payment options are controlled by the backend. Do not send money outside the product.',  icon: WalletCards },
    { title: 'Community', body: 'Use the community page to read route discussions and backend-connected actions.',         icon: MessageCircle },
  ] },
};

const faqs = [
  'How do I find a ride?',
  'What do I need to offer a ride?',
  'How does SyncroGo handle safety?',
  'Can I use the community without booking a ride?',
];

export const ProductPage: React.FC<{ kind: ProductPageKind }> = ({ kind }) => {
  const page = content[kind];
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 py-8 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Header — styled like the Offer page */}
        {kind === 'how' ? (
          <div className="mb-8 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">{page.eyebrow}</span>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-navy-800 sm:text-5xl">{page.title}</h1>
            <p className="mt-3 text-slate-500">{page.description}</p>
          </div>
        ) : (
          <div className="max-w-3xl mb-8 sm:mb-12">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.16em] text-green-600">{page.eyebrow}</span>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-navy-800">{page.title}</h1>
            <p className="mt-3 text-base sm:text-lg leading-7 sm:leading-8 text-slate-500">{page.description}</p>
          </div>
        )}

        {/* Animated rhythm section on the How-It-Works page (header already shown above) */}
        {kind === 'how' && <RhythmSection hideHeading />}

        {/* Feature cards (the 'how' page already shows them inside RhythmSection) */}
        {kind !== 'how' && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 mb-10">
            {page.items.map(({ title, body, icon: Icon }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card hover:shadow-hover hover:-translate-y-0.5 transition-all">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-5"><Icon className="h-5 w-5" /></div>
                <h2 className="font-display text-xl font-bold text-navy-800 mb-2">{title}</h2>
                <p className="text-sm leading-6 text-slate-500">{body}</p>
              </article>
            ))}
          </div>
        )}

        {/* FAQ accordion */}
        {kind === 'help' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 mb-8 shadow-card">
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><CircleHelp className="h-5 w-5" /></div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-navy-800">Frequently asked questions</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {faqs.map((faq, i) => (
                <div key={faq}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm sm:text-[15px] font-bold text-slate-700 hover:text-navy-800 transition-colors"
                  >
                    {faq}
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180 text-green-600' : 'text-slate-400'}`} />
                  </button>
                  {openFaq === i && (
                    <p className="pb-4 text-sm leading-6 text-slate-500 animate-slide-up">
                      This workflow is handled by the current SyncroGo product and backend. Sign in where required, and use the in-app response or report state for the latest status.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
 )}

        {/* Safety report */}
        {kind === 'safety' && (
          <div id="report" className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900">
            <strong>Need to report a problem?</strong> Open Community and use the Report a Problem action. For emergencies, contact local emergency services first.
          </div>
        )}

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Link to="/find-ride" className="rounded-xl px-6 py-3.5 sm:py-3 text-sm font-bold text-white text-center"
            style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)', boxShadow: '0 4px 14px rgba(7,126,233,0.28)' }}>
            Find a Ride
          </Link>
          <Link to="/community" className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 sm:py-3 text-sm font-bold text-slate-700 text-center hover:border-green-400 hover:text-green-700 transition-all">
            Open Community
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ProductPage;