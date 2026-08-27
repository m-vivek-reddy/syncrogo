import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";

interface Driver {
  name: string;
  rating: string;
  car: string;
  eta: string;
  fare: string;
}

export default function NearbyDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNearbyDrivers() {
      try {
        const res = await apiClient.get("/rides/search?pickup_lat=17.385&pickup_lon=78.487&dropoff_lat=17.44&dropoff_lon=78.38");
        const rides = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        const formatted = rides.map((r: any) => ({
          name: r.driver_name || `Driver #${r.driver_id}`,
          rating: r.driver_rating ? Number(r.driver_rating).toFixed(1) : (r.rating ? Number(r.rating).toFixed(1) : "N/A"),
          car: r.vehicle_type === "bike" ? "Bike" : "Car",
          eta: "Near you",
          fare: `₹${r.price_per_seat || r.final_fare}`,
        }));
        setDrivers(formatted);
      } catch {
        setDrivers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchNearbyDrivers();
  }, []);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-slate-800">Nearby Drivers</h2>
        {drivers.length > 0 && <span className="text-xs font-semibold text-emerald-600">Live now</span>}
      </div>
      {loading ? (
        <div className="rounded-2xl bg-white p-4 text-center text-xs text-slate-400">Loading nearby drivers...</div>
      ) : drivers.length === 0 ? (
        <div className="rounded-2xl bg-white p-4 text-center text-xs font-medium text-slate-400">
          No drivers available nearby right now.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {drivers.map((driver, index) => (
            <div key={index} className="min-w-[170px] rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-800">🚗 {driver.name}</p>
                <span className="text-xs font-semibold text-amber-500">★ {driver.rating}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-700">{driver.car}</p>
              <p className="mt-1 text-xs text-slate-500">{driver.eta}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Estimated</span>
                <span className="text-sm font-extrabold text-emerald-600">{driver.fare}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
