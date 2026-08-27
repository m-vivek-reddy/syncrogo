import { useLocation, useNavigate } from 'react-router-dom';

export interface DriverOffer {
  id: number;
  driver_id: number;
  driver_name?: string;
  vehicle_number?: string;
  driver_phone?: string;
  origin: string;
  destination: string;
  price_per_seat: number;
  available_seats: number;
  gender_preference: string;
}

interface RouteDetails {
  pickup: { address: string };
  destination: { address: string };
  maximumFare?: number | null;
}

interface AvailableRidesState {
  routeDetails?: RouteDetails;
  rides?: DriverOffer[];
}

export default function AvailableRides() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { routeDetails, rides = [] } = (state ?? {}) as AvailableRidesState;

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back to ride search"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm hover:bg-gray-100"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Available Rides</h1>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center space-x-3 text-sm">
            <span className="h-3 w-3 flex-shrink-0 rounded-full bg-blue-600" />
            <p className="truncate font-semibold text-gray-800">{routeDetails?.pickup.address || 'Pickup location'}</p>
          </div>
          <div className="my-1 ml-1.5 h-4 border-l-2 border-dashed border-gray-300" />
          <div className="flex items-center space-x-3 text-sm">
            <span className="h-3 w-3 flex-shrink-0 rounded-full bg-emerald-600" />
            <p className="truncate font-semibold text-gray-800">{routeDetails?.destination.address || 'Destination'}</p>
          </div>
          {routeDetails?.maximumFare != null && (
            <div className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <span className="font-bold">Maximum estimated fare: ₹{routeDetails.maximumFare.toFixed(2)}</span>
              <span className="ml-1">(distance and travel time)</span>
            </div>
          )}
        </div>

        <h2 className="mb-4 font-bold text-gray-800">Available Rides Nearby</h2>

        {rides.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-gray-500 shadow-sm">
            No rides are currently available on this route.
          </div>
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => (
              <div key={ride.id} className="rounded-2xl border border-indigo-50 bg-white p-5 shadow-md transition hover:border-indigo-300">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{ride.vehicle_number || 'Vehicle details pending'}</h3>
                    <p className="text-xs text-gray-500">Driver: {ride.driver_name || `Driver ${ride.driver_id}`}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-emerald-600">₹{ride.price_per_seat}</span>
                    <p className="text-xs text-gray-400">{ride.available_seats} seats left</p>
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-600">
                  <span className="truncate pr-2">📍 {ride.origin.split(',')[0]}</span>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-semibold capitalize text-indigo-700">
                    {ride.gender_preference.replace('_', ' ')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/find-ride', { state: { selectedOffer: ride } })}
                  className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-md transition hover:bg-indigo-700"
                >
                  Book This Ride
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
