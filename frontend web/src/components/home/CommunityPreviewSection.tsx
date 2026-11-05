import React from 'react';
import { Link } from 'react-router-dom';
import { Users, MessageSquare, Compass, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export const CommunityPreviewSection: React.FC = () => {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-brand-50 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100 text-brand-800 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Commute Connected</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-navy-950 font-display tracking-tight leading-tight">
            More Than a Ride. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-teal-600 to-emerald-600">
              We're a Community.
            </span>
          </h2>

          <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed">
            SyncroGo connects commuters beyond individual rides. Join route groups, share useful updates, meet fellow commuters, and make your daily journey more connected.
          </p>
        </div>

        {/* 3 Community Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-14">

          {/* Card 1: Route Groups */}
          <div className="relative rounded-3xl p-8 bg-slate-50 border border-slate-200/80 hover:border-brand-400 hover:bg-white hover:shadow-premium transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <Compass className="w-7 h-7" />
              </div>

              <h3 className="text-2xl font-bold text-navy-950 font-display mb-2">
                Route Groups
              </h3>

              <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                "Join people traveling along the same routes."
              </p>

              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Group up with office clusters in HITEC City, Gachibowli, or campus travelers sharing daily transit corridors.
              </p>
            </div>

            <Link
              to="/community?tab=my_groups"
              className="inline-flex items-center justify-between w-full px-5 py-3 rounded-xl bg-white group-hover:bg-brand-600 text-navy-950 group-hover:text-white font-bold text-sm border border-slate-200 group-hover:border-transparent shadow-sm transition-all"
            >
              <span>Explore Groups</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Community Feed */}
          <div className="relative rounded-3xl p-8 bg-slate-50 border border-slate-200/80 hover:border-brand-400 hover:bg-white hover:shadow-premium transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-7 h-7" />
              </div>

              <h3 className="text-2xl font-bold text-navy-950 font-display mb-2">
                Community Feed
              </h3>

              <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                "Share commuting tips, traffic updates, ride experiences, and useful information."
              </p>

              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Share route updates, commuting questions, and ride coordination with fellow commuters.
              </p>
            </div>

            <Link
              to="/community"
              className="inline-flex items-center justify-between w-full px-5 py-3 rounded-xl bg-white group-hover:bg-brand-600 text-navy-950 group-hover:text-white font-bold text-sm border border-slate-200 group-hover:border-transparent shadow-sm transition-all"
            >
              <span>Open Community</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Local Communities */}
          <div className="relative rounded-3xl p-8 bg-slate-50 border border-slate-200/80 hover:border-brand-400 hover:bg-white hover:shadow-premium transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <Users className="w-7 h-7" />
              </div>

              <h3 className="text-2xl font-bold text-navy-950 font-display mb-2">
                Local Communities
              </h3>

              <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                "Discover commuters, students, and professionals around your area."
              </p>

              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Find co-riders from your housing society, university campus, or office campus heading in your exact direction.
              </p>
            </div>

            <Link
              to="/community?tab=nearby"
              className="inline-flex items-center justify-between w-full px-5 py-3 rounded-xl bg-white group-hover:bg-brand-600 text-navy-950 group-hover:text-white font-bold text-sm border border-slate-200 group-hover:border-transparent shadow-sm transition-all"
            >
              <span>Discover Communities</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>

        {/* Prominent CTA */}
        <div className="text-center">
          <Link
            to="/community"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-700 to-navy-900 hover:from-brand-500 hover:to-brand-600 text-white font-bold text-base shadow-xl shadow-brand-600/30 hover:shadow-2xl hover:shadow-brand-600/40 transition-all hover:scale-[1.02] active:scale-[0.99]"
          >
            <Users className="w-5 h-5" />
            <span>Join the SyncroGo Community</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

      </div>
    </section>
  );
};
