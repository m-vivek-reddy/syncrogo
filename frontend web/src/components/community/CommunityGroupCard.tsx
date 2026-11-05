import React from 'react';
import { Users, Check, Plus, Route, Shield } from 'lucide-react';
import type { CommunityGroup } from '../../types';

interface CommunityGroupCardProps {
  group: CommunityGroup;
  onToggleJoin: (groupId: string) => void;
}

export const CommunityGroupCard: React.FC<CommunityGroupCardProps> = ({
  group,
  onToggleJoin,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft hover:shadow-premium transition-all duration-300 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-teal-700 text-white flex items-center justify-center font-bold shadow-md shadow-brand-600/20">
            <Users className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {group.memberCount.toLocaleString()} members
          </span>
        </div>

        <h4 className="text-lg font-bold text-navy-950 font-display mb-1.5">{group.name}</h4>

        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          {group.description}
        </p>

        {group.routeHighlight && (
          <div className="mb-4 flex items-center gap-1.5 text-xs text-brand-700 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-200/50">
            <Route className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{group.routeHighlight}</span>
          </div>
        )}
      </div>

      <button
        onClick={() => onToggleJoin(group.id)}
        className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${group.isJoined
            ? 'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
            : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm'
          }`}
      >
        {group.isJoined ? (
          <>
            <Check className="w-4 h-4" />
            <span>Joined</span>
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            <span>Join Group</span>
          </>
        )}
      </button>
    </div>
  );
};
