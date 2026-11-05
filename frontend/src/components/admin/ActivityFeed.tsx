import {
  Car,
  UserPlus,
  FileText,
  ShieldAlert,
  Star,
  Activity,
} from "lucide-react";

export interface ActivityItem {
  type: string;
  title: string;
  timestamp: string;
}

const ICONS: Record<string, { icon: any; color: string }> = {
  registration: { icon: UserPlus, color: "text-blue-600" },
  document: { icon: FileText, color: "text-yellow-600" },
  sos: { icon: ShieldAlert, color: "text-red-600" },
  ride: { icon: Car, color: "text-green-600" },
  rating: { icon: Star, color: "text-purple-600" },
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function ActivityFeed({ items }: { items?: ActivityItem[] }) {
  const activities = Array.isArray(items) ? items : [];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">

      <h2 className="text-2xl font-bold mb-6">
        Recent Activity
      </h2>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
          <Activity size={28} />
          <p className="text-sm">No recent activity in the last 7 days</p>
        </div>
      ) : (
        <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">

          {activities.map((item, index) => {

            const meta = ICONS[item.type] ?? ICONS.ride;
            const Icon = meta.icon;

            return (

              <div
                key={index}
                className="flex items-center gap-4 border-b pb-4 last:border-none"
              >

                <div className={meta.color}>
                  <Icon size={24} />
                </div>

                <div className="flex-1 min-w-0">

                  <p className="font-semibold truncate">
                    {item.title}
                  </p>

                  <p className="text-gray-500 text-sm">
                    {timeAgo(item.timestamp)}
                  </p>

                </div>

              </div>

            );

          })}

        </div>
      )}

    </div>
  );
}
