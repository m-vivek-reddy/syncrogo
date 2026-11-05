import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Bike, Check, ArrowRight, ShieldCheck, Zap, Fuel, Sparkles } from 'lucide-react';

export const CarpoolBikepoolSection: React.FC = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-block px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-bold uppercase tracking-wider mb-3">
            Two Formats. One Mission.
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 font-display tracking-tight">
            Tailored for Every Indian City Commute
          </h2>
          <p className="mt-3 text-slate-600 text-base">
            Whether you desire air-conditioned comfort on the ring road or a speedy bike ride through metro choke points.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* CARPOOL CARD */}
          <div className="relative rounded-3xl p-8 sm:p-10 bg-gradient-to-br from-brand-950 via-navy-900 to-slate-900 text-white border border-brand-500/20 shadow-xl overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
                  <Car className="w-8 h-8" />
                </div>
                <span className="px-3.5 py-1 rounded-full bg-white/10 text-brand-300 text-xs font-bold uppercase tracking-wider border border-white/10">
                  4-Wheeler Carpool
                </span>
              </div>

              <h3 className="text-3xl font-black text-white font-display mb-2">
                CARPOOL
              </h3>

              <p className="text-xl text-teal-300 font-semibold mb-6">
                "Share a car, split the journey."
              </p>

              <div className="space-y-3.5 mb-8">
                {[
                  'More comfortable',
                  'Share travel costs',
                  'Reduce traffic',
                  'Better utilization of empty seats',
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-slate-200 text-sm sm:text-base font-medium">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-400">Best for: Tech parks, highway corridors & AC comfort</span>
              <Link
                to="/find-ride?type=car"
                className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-navy-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
              >
                <span>Find Carpool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* BIKEPOOL CARD */}
          <div className="relative rounded-3xl p-8 sm:p-10 bg-gradient-to-br from-teal-900/60 via-slate-900 to-navy-950 text-white border border-teal-500/20 shadow-xl overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-amber/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-accent-amber text-navy-950 flex items-center justify-center shadow-lg shadow-accent-amber/30 font-bold">
                  <Bike className="w-8 h-8" />
                </div>
                <span className="px-3.5 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold uppercase tracking-wider border border-white/10">
                  2-Wheeler Bikepool
                </span>
              </div>

              <h3 className="text-3xl font-black text-white font-display mb-2">
                BIKEPOOL
              </h3>

              <p className="text-xl text-amber-300 font-semibold mb-6">
                "Two wheels. One shared journey."
              </p>

              <div className="space-y-3.5 mb-8">
                {[
                  'Quick urban travel',
                  'Affordable commuting',
                  'Easy pickup',
                  'Efficient short-distance travel',
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-slate-200 text-sm sm:text-base font-medium">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-400">Best for: Beating peak-hour jams & quick college rides</span>
              <Link
                to="/find-ride?type=bike"
                className="px-5 py-2.5 rounded-xl bg-accent-amber hover:bg-amber-400 text-navy-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
              >
                <span>Find Bikepool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
