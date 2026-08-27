import { useState } from 'react';
import { API_BASE_URL } from '../api/config';

interface LatLng {
  lat: number;
  lng: number;
}

interface RideRequestButtonProps {
  passengerId: number;
  pickup: LatLng;
  drop: LatLng;
  vehicleType: string;
  distanceKm: number;
}

export function RideRequestButton({ passengerId, pickup, drop, vehicleType, distanceKm }: RideRequestButtonProps) {
  const [loading, setLoading] = useState(false);
  const [rideDetails, setRideDetails] = useState<any>(null);

  const handleRequestRide = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/match/request-ride`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passenger_id: passengerId,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          drop_lat: drop.lat,
          drop_lng: drop.lng,
          distance_km: distanceKm,
          vehicle_type: vehicleType,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setRideDetails(data);
        alert(`Ride requested! Dispatched to driver ID: ${data.dispatched_to_driver.driver_id}`);
      } else {
        alert(data.detail || 'Failed to find a driver.');
      }
    } catch (error) {
      console.error('Error requesting ride:', error);
      alert('Network error while requesting ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <button
        onClick={handleRequestRide}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition duration-200 disabled:opacity-50"
      >
        {loading ? 'Finding Nearby Drivers...' : `Request ${vehicleType.toUpperCase()} (${distanceKm} km)`}
      </button>

      {rideDetails && (
        <div className="mt-4 p-4 bg-gray-50 border rounded-lg text-sm">
          <p className="font-bold text-green-600">Driver Dispatched Successfully!</p>
          <p>Fare (MRP): ₹{rideDetails.pricing?.mrp_fare}</p>
          <p>Assigned Driver: {rideDetails.dispatched_to_driver?.email}</p>
        </div>
      )}
    </div>
  );
}
