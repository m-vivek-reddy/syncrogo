import { useEffect } from "react";
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

  // Always land at the top of the dashboard, smoothly
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!analytics) {
    return <div>Unable to load dashboard.</div>;
  }

  const currency = (v: any) =>
    `₹${Number(v ?? 0).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`;

  return (

    <div className="
    min-h-screen
    bg-gradient-to-br
    from-slate-100
    via-blue-50
    to-slate-100
  ">


      <div className="space-y-5 sm:space-y-8">



        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">

          <StatCard
            title="Passengers"
            value={Number(analytics.total_passengers ?? 0)}
            icon={<Users className="text-white" size={26} />}
            color="bg-blue-500"
            subtitle={`${Number(analytics.new_users_this_week ?? 0)} new this week`}
            index={0}
          />

          <StatCard
            title="Drivers"
            value={Number(analytics.total_drivers ?? 0)}
            icon={<Car className="text-white" size={26} />}
            color="bg-green-500"
            subtitle={`${Number(analytics.pending_documents ?? 0)} documents pending`}
            index={1}
          />

          <StatCard
            title="Revenue"
            value={currency(analytics.platform_total_revenue)}
            icon={<IndianRupee className="text-white" size={26} />}
            color="bg-emerald-500"
            subtitle="Platform lifetime"
            index={2}
          />

          <StatCard
            title="Total Rides"
            value={Number(analytics.total_rides_booked ?? 0)}
            icon={<Route className="text-white" size={26} />}
            color="bg-purple-500"
            subtitle={`${Number(analytics.ongoing_rides ?? 0)} ongoing`}
            index={3}
          />

          <StatCard
            title="Completed"
            value={Number(analytics.completed_rides ?? 0)}
            icon={<CheckCircle2 className="text-white" size={26} />}
            color="bg-cyan-500"
            subtitle={`${Number(analytics.cancelled_rides ?? 0)} cancelled`}
            index={4}
          />

          <StatCard
            title="SOS Alerts"
            value={Number(analytics.active_emergencies ?? 0)}
            icon={<ShieldAlert className="text-white" size={26} />}
            color="bg-red-500"
            subtitle={Number(analytics.active_emergencies ?? 0) > 0 ? "Needs attention" : "All clear"}
            index={5}
          />

        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          <div className="xl:col-span-2">
            <RevenueChart data={analytics.revenue_series} />
          </div>

          <RideChart
            completed={Number(analytics.completed_rides ?? 0)}
            cancelled={Number(analytics.cancelled_rides ?? 0)}
            ongoing={Number(analytics.ongoing_rides ?? 0)}
          />

        </div>

        {/* Quick Actions */}
        <QuickActions />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          <DocumentTable documents={documents} />

          <ActivityFeed items={analytics.recent_activity} />

        </div>

      </div>

    </div>

  );
}
