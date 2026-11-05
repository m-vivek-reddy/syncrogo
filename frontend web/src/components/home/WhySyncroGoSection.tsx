import React from 'react';
import {
  Wallet,
  Route,
  MapPin,
  MessageCircle,
  Star,
  Users,
} from 'lucide-react';

export const WhySyncroGoSection: React.FC = () => {
  const features = [
    {
      title: 'Affordable',
      quote: 'Share travel costs instead of traveling alone.',
      desc: 'Share eligible travel costs with co-commuters instead of making every journey alone.',
      icon: Wallet,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
      badge: 'Shared costs',
    },
    {
      title: 'Route Matching',
      quote: 'Find rides that match your journey.',
      desc: 'Our dynamic Indian corridor matching aligns origin and destination nodes without out-of-the-way detours.',
      icon: Route,
      color: 'bg-brand-50 text-brand-600 border-brand-200/60',
      badge: 'Corridor Smart',
    },
    {
      title: 'Route visibility',
      quote: 'See the route and ride details clearly.',
      desc: 'Review route information and backend ride status where those details are available for your journey.',
      icon: MapPin,
      color: 'bg-sky-50 text-sky-600 border-sky-200/60',
      badge: 'Backend status',
    },
    {
      title: 'Communication',
      quote: 'Connect with your driver or passenger.',
      desc: 'Coordinate exact pickup spots, landmark gates, and timing adjustments via secure in-app messaging before departure.',
      icon: MessageCircle,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200/60',
      badge: 'Direct Chat',
    },
    {
      title: 'Ratings & Trust',
      quote: 'Build a reliable community through ratings.',
      desc: 'Use ratings and verification indicators when they are returned by the SyncroGo account and ride systems.',
      icon: Star,
      color: 'bg-amber-50 text-amber-600 border-amber-200/60',
      badge: 'Mutual Ratings',
    },
    {
      title: 'Community',
      quote: 'Connect with people who share your routes and interests.',
      desc: 'Turn dull daily traffic into a pleasant networking space with fellow colleagues, college peers, and neighborhood travelers.',
      icon: Users,
      color: 'bg-teal-50 text-teal-600 border-teal-200/60',
      badge: 'Route Hubs',
    },
  ];

  return (
    <section className="py-20 bg-slate-50/60 border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-bold uppercase tracking-wider mb-3">
            The SyncroGo Difference
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 font-display tracking-tight">
            Why SyncroGo
          </h2>
          <p className="mt-3 text-slate-600 text-base">
            Built ground-up around the genuine daily transit reality of Indian office corridors and university campuses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm ${feat.color}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-navy-950 font-display mb-2 group-hover:text-brand-700 transition-colors">
                    {feat.title}
                  </h3>

                  <p className="text-sm font-semibold text-brand-800 mb-3">
                    "{feat.quote}"
                  </p>

                  <p className="text-slate-500 text-sm leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
