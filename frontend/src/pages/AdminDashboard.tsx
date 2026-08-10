import StatCard from "../components/admin/StatCard";
import DocumentTable from "../components/admin/DocumentTable";
import RevenueChart from "../components/admin/RevenueChart";
import RideChart from "../components/admin/RideChart";
import ActivityFeed from "../components/admin/ActivityFeed";
import QuickActions from "../components/admin/QuickActions";
import useAdmin from "../hooks/useAdmin";

import {
  Users,
  Car,
  IndianRupee,
  Route,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

export default function AdminDashboard() {

 const {
  analytics,
  documents,
  loading,

} = useAdmin();

if (loading) {
  return <div>Loading...</div>;
}

if (!analytics) {
  return <div>Unable to load dashboard.</div>;
}

return (

  <div className="
    min-h-screen
    bg-gradient-to-br
    from-slate-100
    via-blue-50
    to-slate-100
  ">


    <div className="p-8 space-y-8">



  {/* Statistics */}
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

    <StatCard
      title="Passengers"
      value={analytics.total_passengers}
      icon={<Users className="text-white" size={26} />}
      color="bg-blue-500"
    />

    <StatCard
      title="Drivers"
      value={analytics.total_drivers}
      icon={<Car className="text-white" size={26} />}
      color="bg-green-500"
    />

    <StatCard
      title="Revenue"
      value={`₹${analytics.platform_total_revenue}`}
      icon={<IndianRupee className="text-white" size={26} />}
      color="bg-emerald-500"
    />

    <StatCard
      title="Total Rides"
      value={analytics.total_rides_booked}
      icon={<Route className="text-white" size={26} />}
      color="bg-purple-500"
    />

    <StatCard
      title="Completed"
      value={analytics.completed_rides}
      icon={<CheckCircle2 className="text-white" size={26} />}
      color="bg-cyan-500"
    />

    <StatCard
      title="SOS Alerts"
      value={analytics.active_emergencies}
      icon={<ShieldAlert className="text-white" size={26} />}
      color="bg-red-500"
    />

  </div>

  {/* Charts */}
  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

    <div className="xl:col-span-2">
      <RevenueChart />
    </div>

    <RideChart />

  </div>

 {/* Quick Actions */}
<QuickActions />

<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

  <DocumentTable documents={documents} />

  <ActivityFeed />

    </div>

    </div>

  </div>

);
}