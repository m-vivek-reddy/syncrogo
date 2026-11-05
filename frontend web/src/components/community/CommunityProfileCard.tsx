import React from 'react';
import { ShieldCheck, Star, Car, Users, Award, ShieldAlert, Heart, MessageSquare, Pencil } from 'lucide-react';
import type { User, CommunityBadge } from '../../types';

interface CommunityProfileCardProps {
  user?: User | null;
  badges: CommunityBadge[];
  onOpenReport?: () => void;
  onOpenEdit?: () => void;
}

export const CommunityProfileCard: React.FC<CommunityProfileCardProps> = ({
  user,
  badges,
  onOpenReport,
  onOpenEdit,
}) => {
  const profileName = user?.name || 'SyncroGo member';

  return (
    <div className="space-y-6">

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative shrink-0 group">
            {user?.profile_photo ? (
              <img
                src={user.profile_photo}
                alt={profileName}
                className="w-16 h-16 rounded-2xl object-cover shadow-md shadow-brand-600/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-teal-800 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shadow-brand-600/20">
                {profileName.charAt(0).toUpperCase()}
              </div>
            )}
            {onOpenEdit && (
              <button
                onClick={onOpenEdit}
                className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-green-600 text-white shadow-md hover:bg-green-700 transition-colors ring-2 ring-white"
                title="Edit profile"
                aria-label="Edit profile"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-navy-950 font-display truncate">{profileName}</h3>
              {user?.is_verified && <span title="Verified member" className="shrink-0"><ShieldCheck className="w-4 h-4 text-brand-600" /></span>}
            </div>
            {typeof user?.rating === 'number' && <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold mt-0.5">
              <Star className="w-3 h-3 fill-current shrink-0" />
              <span className="truncate">{user.rating.toFixed(1)} Trust Score</span>
            </div>}
            <div className="text-[10px] text-slate-500 mt-0.5">Public profile</div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-center">
          <div className="p-2 rounded-xl bg-slate-50">
            <div className="text-lg font-black text-navy-950 font-display">{user?.rides_count ?? '—'}</div>
            <div className="text-[11px] font-semibold text-slate-500">Shared Trips</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-50">
            <div className="text-lg font-black text-brand-700 font-display">{user?.communities_count ?? '—'}</div>
            <div className="text-[11px] font-semibold text-slate-500">Hubs Joined</div>
          </div>
        </div>

        {/* Badges preview */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Achievement Badges</span>
            <span className="text-[10px] text-brand-700 font-bold bg-brand-50 px-2 py-0.5 rounded-full">
              {badges.filter(b => b.earned).length} Earned
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {badges.slice(0, 4).map((badge) => (
              <div
                key={badge.id}
                className={`p-2 rounded-xl border flex items-center gap-2 text-xs transition-colors ${badge.earned
                    ? 'border-brand-200 bg-brand-50/50 text-brand-900 font-medium'
                    : 'border-slate-200 bg-slate-50/50 text-slate-400 opacity-60'
                  }`}
              >
                <Award className={`w-4 h-4 shrink-0 ${badge.earned ? 'text-brand-600' : 'text-slate-400'}`} />
                <span className="truncate text-[11px] font-semibold">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Public profile only</span>
          <span className="text-brand-700 font-medium">Private data hidden</span>
        </div>
      </div>

      {/* Safety Notice Card */}
      <div className="bg-gradient-to-br from-amber-500/10 via-white to-brand-50/30 rounded-3xl p-6 border border-amber-200/80 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <h4 className="text-sm font-bold text-navy-950 font-display">Keep SyncroGo Safe</h4>
        </div>

        <ul className="space-y-2 text-xs text-slate-600 leading-relaxed mb-4">
          <li className="flex items-start gap-1.5">
            <span className="text-amber-600 font-bold">•</span>
            <span>Respect co-travelers and uphold zero discrimination.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-amber-600 font-bold">•</span>
            <span>Never share sensitive OTPs or bank accounts publicly.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-amber-600 font-bold">•</span>
            <span>Meet only at open, well-lit landmark pickup points.</span>
          </li>
        </ul>

        <button
          onClick={onOpenReport}
          className="w-full py-2.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-700 font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
        >
          Report a Problem
        </button>
      </div>

    </div>
  );
};
