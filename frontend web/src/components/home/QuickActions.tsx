import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Bike, ArrowRight, Search, PlusCircle } from 'lucide-react';

export const QuickActions: React.FC = () => {
  return (
    <section className="py-12 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">

          {/* Card 1: Find a Ride */}
          <div className="relative group p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-brand-50/70 via-white to-teal-50/40 border border-brand-200/60 shadow-soft hover:shadow-premium transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center mb-6 shadow-md shadow-brand-600/20 group-hover:scale-105 transition-transform">
              <Search className="w-7 h-7" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-bold uppercase tracking-wider mb-2">
              For Passengers & Daily Commuters
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-display mb-3">
              Find a Ride
            </h3>

            <p className="text-slate-600 text-base leading-relaxed mb-6">
              Find passengers or drivers traveling your way. Search carpools and bikepools returned by the SyncroGo matching service.
            </p>

            <Link
              to="/find-ride"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/20 transition-all group-hover:gap-3.5"
            >
              <span>Find a Ride</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Offer a Ride */}
          <div className="relative group p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-slate-900 via-navy-900 to-navy-950 text-white border border-slate-800 shadow-soft hover:shadow-premium transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-navy-950 flex items-center justify-center mb-6 shadow-md shadow-teal-400/20 group-hover:scale-105 transition-transform font-bold">
              <PlusCircle className="w-7 h-7" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-teal-300 text-xs font-bold uppercase tracking-wider mb-2 border border-white/10">
              For Car & Bike Owners
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-display mb-3">
              Offer a Ride
            </h3>

            <p className="text-slate-300 text-base leading-relaxed mb-6">
              Have empty seats? Share your journey and split the cost. Recover fuel expenses while reducing traffic on your city routes.
            </p>

            <Link
              to="/offer-ride"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-navy-950 font-bold text-sm shadow-md transition-all group-hover:gap-3.5"
            >
              <span>Offer a Ride</span>
              <ArrowRight className="w-4 h-4 text-brand-600" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
};
