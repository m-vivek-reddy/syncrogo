import {
  CarFront,
  Star,
  IndianRupee,
  Users,
} from "lucide-react";

interface StatsCardProps {
  trips?: number;
  rating?: number;
  savings?: number;
  referrals?: number;

  // Driver Stats
  earnings?: number;
  ridesOffered?: number;
  isDriver?: boolean;
}

export default function StatsCard({
  trips = 0,
  rating = 0,
  savings = 0,
  referrals = 0,
  earnings = 0,
  ridesOffered = 0,
  isDriver = false,
}: StatsCardProps) {
  const Stat = ({
    icon: Icon,
    value,
    label,
    color,
  }: {
    icon: any;
    value: string | number;
    label: string;
    color: string;
  }) => (
    <div className="bg-white rounded-3xl shadow-sm p-5 flex flex-col items-center justify-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">

      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${color}`}
      >
        <Icon size={26} className="text-white" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900">
        {value}
      </h2>

      <p className="text-sm text-slate-500 mt-1 text-center">
        {label}
      </p>

    </div>
  );

  return (
    <div className="mx-5 mt-5">

      <h2 className="text-lg font-bold text-slate-900 mb-4">
        Statistics
      </h2>

      <div className="grid grid-cols-2 gap-4">

        <Stat
          icon={CarFront}
          value={isDriver ? ridesOffered : trips}
          label={isDriver ? "Rides Offered" : "Trips Completed"}
          color="bg-blue-500"
        />

        <Stat
          icon={Star}
          value={rating.toFixed(1)}
          label="Rating"
          color="bg-yellow-500"
        />

        <Stat
          icon={IndianRupee}
          value={`₹${isDriver ? earnings : savings}`}
          label={isDriver ? "Total Earnings" : "Money Saved"}
          color="bg-green-500"
        />

        <Stat
          icon={Users}
          value={referrals}
          label="Referrals"
          color="bg-purple-500"
        />

      </div>

    </div>
  );
}