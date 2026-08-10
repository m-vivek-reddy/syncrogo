import {
  Car,
  UserPlus,
  FileText,
  ShieldAlert,
  Star,
} from "lucide-react";

const activities = [
  {
    icon: UserPlus,
    color: "text-blue-600",
    title: "New passenger registered",
    time: "2 mins ago",
  },
  {
    icon: Car,
    color: "text-green-600",
    title: "Driver created a ride",
    time: "5 mins ago",
  },
  {
    icon: FileText,
    color: "text-yellow-600",
    title: "Driver uploaded Driving License",
    time: "10 mins ago",
  },
  {
    icon: ShieldAlert,
    color: "text-red-600",
    title: "SOS Alert Triggered",
    time: "18 mins ago",
  },
  {
    icon: Star,
    color: "text-purple-600",
    title: "Ride Rated ★★★★★",
    time: "25 mins ago",
  },
];

export default function ActivityFeed() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">

      <h2 className="text-2xl font-bold mb-6">
        Recent Activity
      </h2>

      <div className="space-y-5">

        {activities.map((item, index) => {

          const Icon = item.icon;

          return (

            <div
              key={index}
              className="flex items-center gap-4 border-b pb-4 last:border-none"
            >

              <div className={`${item.color}`}>
                <Icon size={24} />
              </div>

              <div className="flex-1">

                <p className="font-semibold">
                  {item.title}
                </p>

                <p className="text-gray-500 text-sm">
                  {item.time}
                </p>

              </div>

            </div>

          );

        })}

      </div>

    </div>
  );
}