// src/hooks/useRideTracking.ts

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { apiClient } from "../api/client";

import {
  getRoadRoute,
  type LeafletRoute,
} from "../services/routing";

// ============================================================
// TYPES
// ============================================================

export interface LocationPoint {
  latitude: number;
  longitude: number;
}

export interface LiveBooking {
  id: number;
  ride_id: number;

  passenger_id: number;
  driver_id: number;

  pickup_location?: string | null;
  pickup_lat?: number | null;
  pickup_lon?: number | null;

  dropoff_location?: string | null;
  dropoff_lat?: number | null;
  dropoff_lon?: number | null;

  fare?: number | null;

  status?: string | null;

  passenger_lat?: number | null;
  passenger_lon?: number | null;

  driver_lat?: number | null;
  driver_lon?: number | null;

  otp_verified?: boolean;

  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
}

interface UseRideTrackingResult {
  booking: LiveBooking | null;

  driverLocation: LocationPoint | null;

  passengerLocation: LocationPoint | null;

  pickupLocation: LocationPoint | null;

  destinationLocation: LocationPoint | null;

  route: LeafletRoute;

  distanceKm: number | null;

  durationMinutes: number | null;

  loading: boolean;

  routing: boolean;

  error: string | null;

  refreshBooking: () => Promise<void>;

  startTracking: () => void;

  stopTracking: () => void;
}

// ============================================================
// HELPERS
// ============================================================

function isValidCoordinate(
  latitude: unknown,
  longitude: unknown
): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function toLocation(
  latitude?: number | null,
  longitude?: number | null
): LocationPoint | null {
  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  return {
    latitude: latitude as number,
    longitude: longitude as number,
  };
}

// ============================================================
// HOOK
// ============================================================

export default function useRideTracking(
  bookingId: number
): UseRideTrackingResult {
  const [booking, setBooking] =
    useState<LiveBooking | null>(null);

  const [driverLocation, setDriverLocation] =
    useState<LocationPoint | null>(null);

  const [passengerLocation, setPassengerLocation] =
    useState<LocationPoint | null>(null);

  const [pickupLocation, setPickupLocation] =
    useState<LocationPoint | null>(null);

  const [destinationLocation, setDestinationLocation] =
    useState<LocationPoint | null>(null);

  const [route, setRoute] =
    useState<LeafletRoute>([]);

  const [distanceKm, setDistanceKm] =
    useState<number | null>(null);

  const [durationMinutes, setDurationMinutes] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [routing, setRouting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const trackingRef = useRef(false);

  const routeRequestRef = useRef(0);

  // ==========================================================
  // LOAD LIVE BOOKING
  // ==========================================================

  const refreshBooking = useCallback(async () => {
    if (!bookingId || !Number.isFinite(bookingId)) {
      setError("Invalid booking ID.");
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const response = await apiClient.get(
        `/bookings/${bookingId}/live`
      );

      const data = response.data as LiveBooking;

      setBooking(data);

      // ------------------------------------------------------
      // Driver
      // ------------------------------------------------------

      const driver = toLocation(
        data.driver_lat,
        data.driver_lon
      );

      setDriverLocation(driver);

      // ------------------------------------------------------
      // Passenger
      // ------------------------------------------------------

      const passenger = toLocation(
        data.passenger_lat,
        data.passenger_lon
      );

      setPassengerLocation(passenger);

      // ------------------------------------------------------
      // Pickup
      // ------------------------------------------------------

      const pickup = toLocation(
        data.pickup_lat,
        data.pickup_lon
      );

      setPickupLocation(pickup);

      // ------------------------------------------------------
      // Destination
      // ------------------------------------------------------

      const destination = toLocation(
        data.dropoff_lat,
        data.dropoff_lon
      );

      setDestinationLocation(destination);
    } catch (err: any) {
      console.error(
        "Failed to load live booking:",
        err
      );

      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Unable to load ride information.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  // ==========================================================
  // GENERATE ROAD ROUTE
  // ==========================================================

  const generateRoute = useCallback(
    async (
      driver: LocationPoint,
      destination: LocationPoint
    ) => {
      const requestId =
        ++routeRequestRef.current;

      try {
        setRouting(true);

        const result = await getRoadRoute(
          driver,
          destination
        );

        // Ignore an older request if a newer one completed.
        if (
          requestId !== routeRequestRef.current
        ) {
          return;
        }

        setRoute(result.coordinates);

        setDistanceKm(result.distanceKm);

        setDurationMinutes(
          result.durationMinutes
        );
      } catch (err) {
        console.error(
          "Failed to generate road route:",
          err
        );

        if (
          requestId === routeRequestRef.current
        ) {
          setRoute([]);
          setDistanceKm(null);
          setDurationMinutes(null);
        }
      } finally {
        if (
          requestId === routeRequestRef.current
        ) {
          setRouting(false);
        }
      }
    },
    []
  );

  // ==========================================================
  // INITIAL BOOKING LOAD
  // ==========================================================

  useEffect(() => {
    refreshBooking();
  }, [refreshBooking]);

  // ==========================================================
  // GENERATE INITIAL ROUTE
  // ==========================================================

  useEffect(() => {
    if (
      !driverLocation ||
      !destinationLocation
    ) {
      return;
    }

    generateRoute(
      driverLocation,
      destinationLocation
    );
  }, [
    driverLocation,
    destinationLocation,
    generateRoute,
  ]);

  // ==========================================================
  // SEND DRIVER GPS TO BACKEND
  // ==========================================================

  const sendDriverLocation = useCallback(
    async (position: GeolocationPosition) => {
      try {
        await apiClient.post(
          `/bookings/${bookingId}/driver-location`,
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
        );
      } catch (err) {
        console.error(
          "Failed to update driver location:",
          err
        );
      }
    },
    [bookingId]
  );

  // ==========================================================
  // START GPS TRACKING
  // ==========================================================

  const startTracking = useCallback(() => {
    if (trackingRef.current) {
      return;
    }

    if (!navigator.geolocation) {
      setError(
        "Geolocation is not supported by this browser."
      );

      return;
    }

    trackingRef.current = true;

    const watchId =
      navigator.geolocation.watchPosition(
        async (position) => {
          const location: LocationPoint = {
            latitude:
              position.coords.latitude,

            longitude:
              position.coords.longitude,
          };

          setDriverLocation(location);

          await sendDriverLocation(position);
        },
        (geoError) => {
          console.error(
            "GPS error:",
            geoError
          );

          setError(
            geoError.message ||
              "Unable to access your location."
          );
        },
        {
          enableHighAccuracy: true,

          maximumAge: 3000,

          timeout: 15000,
        }
      );

    (
      window as Window & {
        __syncrogoWatchId?: number;
      }
    ).__syncrogoWatchId = watchId;
  }, [sendDriverLocation]);

  // ==========================================================
  // STOP GPS TRACKING
  // ==========================================================

  const stopTracking = useCallback(() => {
    const windowWithTracking =
      window as Window & {
        __syncrogoWatchId?: number;
      };

    if (
      windowWithTracking.__syncrogoWatchId !==
      undefined
    ) {
      navigator.geolocation.clearWatch(
        windowWithTracking.__syncrogoWatchId
      );

      delete windowWithTracking.__syncrogoWatchId;
    }

    trackingRef.current = false;
  }, []);

  // ==========================================================
  // AUTOMATIC LIVE BOOKING REFRESH
  // ==========================================================

  useEffect(() => {
    if (!bookingId) {
      return;
    }

    const interval = window.setInterval(() => {
      refreshBooking();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [bookingId, refreshBooking]);

  // ==========================================================
  // START TRACKING WHEN COMPONENT MOUNTS
  // ==========================================================

  useEffect(() => {
    startTracking();

    return () => {
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    booking,

    driverLocation,

    passengerLocation,

    pickupLocation,

    destinationLocation,

    route,

    distanceKm,

    durationMinutes,

    loading,

    routing,

    error,

    refreshBooking,

    startTracking,

    stopTracking,
  };
}