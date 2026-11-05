import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import { updateRideLocationApi } from '../api/rides';

interface ActiveRide {
  id: number;
  status?: string;
  price_locked?: boolean;
  distance_km?: number;
  remaining_distance_km?: number;
}

const BROADCAST_INTERVAL_MS = 30_000;
const MIN_MOVEMENT_M = 25;

/**
 * Keeps a driver's published ride in sync with where they actually are.
 *
 * While nobody has booked, every GPS fix is pushed to the backend, which
 * deducts the covered distance from the trip and re-prices the fare. Passengers
 * searching in that window see the shrinking figure. Once a passenger books,
 * the backend locks the price and further updates are ignored.
 */
export const useDriverLocationBroadcast = (enabled: boolean) => {
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const lastSent = useRef<{ lat: number; lon: number } | null>(null);
  const rideIdRef = useRef<number | null>(null);

  // Find the ride the driver is currently running, so we know which one to report.
  useEffect(() => {
    if (!enabled) {
      setActiveRide(null);
      rideIdRef.current = null;
      return;
    }

    let cancelled = false;

    const discover = async () => {
      try {
        const res = await apiClient.get('/api/v1/rides/driver/active');
        const ride = res.data?.data;
        if (cancelled) return;
        if (ride && ride.id) {
          setActiveRide(ride);
          rideIdRef.current = ride.id;
        } else {
          setActiveRide(null);
          rideIdRef.current = null;
        }
        setLastError(null);
      } catch {
        // Silent: the trips page already surfaces booking/ride errors.
      }
    };

    void discover();
    const id = window.setInterval(discover, BROADCAST_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !activeRide?.id || !navigator.geolocation) return;

    const push = () => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const prev = lastSent.current;
          // Skip jitter-level movement so we do not hammer the API.
          if (prev && Math.hypot(coords.latitude - prev.lat, coords.longitude - prev.lon) < MIN_MOVEMENT_M / 1000) {
            return;
          }
          lastSent.current = { lat: coords.latitude, lon: coords.longitude };

          const result = await updateRideLocationApi(activeRide.id, coords.latitude, coords.longitude);
          if (result.success && typeof result.distance_km === 'number') {
            setActiveRide((r) =>
              r
                ? {
                  ...r,
                  distance_km: result.distance_km as number,
                  remaining_distance_km: result.distance_km as number,
                  price_locked: result.price_locked,
                }
                : r,
            );
            setLastError(null);
          } else if (!result.success && result.message) {
            setLastError(result.message);
          }
        },
        () => setLastError('Location unavailable — the remaining distance is not being updated.'),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 },
      );
    };

    push();
    const id = window.setInterval(push, BROADCAST_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled, activeRide?.id]);

  return { activeRide, lastError };
};