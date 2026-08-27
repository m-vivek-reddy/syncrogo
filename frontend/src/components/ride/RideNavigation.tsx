// src/components/ride/RideNavigation.tsx

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import useRideTracking, {
  type LocationPoint,
} from "../../hooks/useRideTracking";

import { apiClient } from "../../api/client";

// ============================================================
// TYPES
// ============================================================

interface RideNavigationProps {
  bookingId: number;

  onComplete?: () => void;
}

// ============================================================
// MAP FOLLOW CONTROLLER
// ============================================================

function NavigationController({
  driverLocation,
}: {
  driverLocation: LocationPoint | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!driverLocation) {
      return;
    }

    map.flyTo(
      [
        driverLocation.latitude,
        driverLocation.longitude,
      ],
      16,
      {
        animate: true,
        duration: 0.8,
      }
    );
  }, [driverLocation, map]);

  useEffect(() => {
    const handleFollow =
      () => {
        if (!driverLocation) {
          return;
        }

        map.flyTo(
          [
            driverLocation.latitude,
            driverLocation.longitude,
          ],
          17,
          {
            animate: true,
            duration: 0.8,
          }
        );
      };

    window.addEventListener(
      "syncrogo-follow-driver",
      handleFollow
    );

    return () => {
      window.removeEventListener(
        "syncrogo-follow-driver",
        handleFollow
      );
    };
  }, [driverLocation, map]);

  return null;
}

// ============================================================
// ICONS
// ============================================================

const driverIcon = L.divIcon({
  className:
    "syncrogo-driver-navigation-marker",

  html: `
    <div
      style="
        width:46px;
        height:46px;
        border-radius:50%;
        background:#111827;
        border:4px solid white;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 5px 18px rgba(0,0,0,.4);
        font-size:24px;
      "
    >
      🚗
    </div>
  `,

  iconSize: [46, 46],

  iconAnchor: [23, 23],
});

const passengerIcon = L.divIcon({
  className:
    "syncrogo-passenger-navigation-marker",

  html: `
    <div
      style="
        width:40px;
        height:40px;
        border-radius:50%;
        background:#2563eb;
        border:4px solid white;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 5px 18px rgba(0,0,0,.35);
        font-size:20px;
      "
    >
      👤
    </div>
  `,

  iconSize: [40, 40],

  iconAnchor: [20, 20],
});

const pickupIcon = L.divIcon({
  className:
    "syncrogo-pickup-navigation-marker",

  html: `
    <div
      style="
        width:42px;
        height:42px;
        border-radius:50%;
        background:#16a34a;
        border:4px solid white;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 5px 18px rgba(0,0,0,.35);
        font-size:20px;
      "
    >
      📍
    </div>
  `,

  iconSize: [42, 42],

  iconAnchor: [21, 21],
});

const destinationIcon = L.divIcon({
  className:
    "syncrogo-destination-navigation-marker",

  html: `
    <div
      style="
        width:46px;
        height:46px;
        border-radius:50%;
        background:#dc2626;
        border:4px solid white;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 5px 18px rgba(0,0,0,.4);
        font-size:22px;
      "
    >
      🏁
    </div>
  `,

  iconSize: [46, 46],

  iconAnchor: [23, 23],
});

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function RideNavigation({
  bookingId,
  onComplete,
}: RideNavigationProps) {
  const {
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
  } = useRideTracking(bookingId);

  const [showDetails, setShowDetails] =
    useState(true);

  const [completing, setCompleting] =
    useState(false);

  const [completeError, setCompleteError] =
    useState<string | null>(null);

  // ==========================================================
  // COMPLETE RIDE
  // ==========================================================

  const completeRide = async () => {
    if (completing) {
      return;
    }

    try {
      setCompleting(true);

      setCompleteError(null);

      await apiClient.post(
        `/bookings/${bookingId}/complete`
      );

      if (onComplete) {
        onComplete();
      } else {
        await refreshBooking();
      }
    } catch (err: any) {
      console.error(
        "Failed to complete ride:",
        err
      );

      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Unable to complete ride.";

      setCompleteError(message);
    } finally {
      setCompleting(false);
    }
  };

  // ==========================================================
  // MAP CENTER
  // ==========================================================

  const center = useMemo<
    [number, number]
  >(() => {
    if (driverLocation) {
      return [
        driverLocation.latitude,
        driverLocation.longitude,
      ];
    }

    if (pickupLocation) {
      return [
        pickupLocation.latitude,
        pickupLocation.longitude,
      ];
    }

    if (destinationLocation) {
      return [
        destinationLocation.latitude,
        destinationLocation.longitude,
      ];
    }

    return [20.5937, 78.9629];
  }, [
    driverLocation,
    pickupLocation,
    destinationLocation,
  ]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-5xl">
            🗺️
          </div>

          <h2 className="text-lg font-bold text-gray-900">
            Loading ride...
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Getting live ride information.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error &&
    !driverLocation &&
    !destinationLocation
  ) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-xl">
          <div className="mb-4 text-5xl">
            ⚠️
          </div>

          <h2 className="text-xl font-bold text-gray-900">
            Unable to load ride
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {error}
          </p>

          <button
            type="button"
            onClick={refreshBooking}
            className="mt-6 w-full rounded-2xl bg-blue-600 py-4 font-semibold text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAP
  // ==========================================================

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-100">
      <MapContainer
        center={center}
        zoom={16}
        zoomControl={false}
        scrollWheelZoom={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        className="h-full w-full"
        style={{
          height: "100%",
          width: "100%",
          zIndex: 0,
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <NavigationController
          driverLocation={driverLocation}
        />

        {/* ====================================================
            DRIVER
        ==================================================== */}

        {driverLocation && (
          <Marker
            position={[
              driverLocation.latitude,
              driverLocation.longitude,
            ]}
            icon={driverIcon}
          >
            <Popup>
              <strong>
                Your current location
              </strong>
            </Popup>
          </Marker>
        )}

        {/* ====================================================
            PASSENGER
        ==================================================== */}

        {passengerLocation && (
          <Marker
            position={[
              passengerLocation.latitude,
              passengerLocation.longitude,
            ]}
            icon={passengerIcon}
          >
            <Popup>
              <strong>
                Passenger
              </strong>
            </Popup>
          </Marker>
        )}

        {/* ====================================================
            PICKUP
        ==================================================== */}

        {pickupLocation && (
          <Marker
            position={[
              pickupLocation.latitude,
              pickupLocation.longitude,
            ]}
            icon={pickupIcon}
          >
            <Popup>
              <strong>
                Passenger pickup
              </strong>
            </Popup>
          </Marker>
        )}

        {/* ====================================================
            DESTINATION
        ==================================================== */}

        {destinationLocation && (
          <Marker
            position={[
              destinationLocation.latitude,
              destinationLocation.longitude,
            ]}
            icon={destinationIcon}
          >
            <Popup>
              <strong>
                Destination
              </strong>
            </Popup>
          </Marker>
        )}

        {/* ====================================================
            REAL ROAD ROUTE
        ==================================================== */}

        {route.length > 1 && (
          <Polyline
            positions={route}
            pathOptions={{
              color: "#2563eb",
              weight: 7,
              opacity: 0.9,
            }}
          />
        )}
      </MapContainer>

      {/* ======================================================
          TOP STATUS
      ====================================================== */}

      <div className="absolute left-4 right-4 top-4 z-[1000]">
        <div className="rounded-2xl bg-white px-4 py-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <span className="text-lg">
                🟢
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                Ride in progress
              </p>

              <p className="truncate text-xs text-gray-500">
                {booking?.status ||
                  "Navigation started"}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowDetails(
                  (previous) =>
                    !previous
                )
              }
              className="rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700"
            >
              {showDetails
                ? "Hide"
                : "Details"}
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================
          GPS FOLLOW BUTTON
      ====================================================== */}

      <button
        type="button"
        aria-label="Center on current location"
        className="absolute bottom-[245px] right-4 z-[1000] flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-xl"
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent(
              "syncrogo-follow-driver"
            )
          );
        }}
      >
        🎯
      </button>

      {/* ======================================================
          BOTTOM SHEET
      ====================================================== */}

      {showDetails && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000]">
          <div className="rounded-t-[28px] bg-white px-5 pb-6 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
            {/* Handle */}

            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300" />

            {/* Destination */}

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-xl">
                🏁
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Destination
                </p>

                <p className="mt-1 truncate text-base font-bold text-gray-900">
                  {booking?.dropoff_location ||
                    "Ride destination"}
                </p>
              </div>

              {distanceKm !== null && (
                <div className="shrink-0 text-right">
                  <p className="text-xl font-bold text-blue-600">
                    {distanceKm < 1
                      ? `${Math.round(
                          distanceKm *
                            1000
                        )} m`
                      : `${distanceKm.toFixed(
                          1
                        )} km`}
                  </p>

                  <p className="text-xs text-gray-400">
                    remaining
                  </p>
                </div>
              )}
            </div>

            {/* ETA */}

            {durationMinutes !== null && (
              <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">
                      Estimated travel time
                    </p>

                    <p className="text-lg font-bold text-gray-900">
                      {Math.max(
                        1,
                        Math.round(
                          durationMinutes
                        )
                      )}{" "}
                      min
                    </p>
                  </div>

                  <div className="text-2xl">
                    🛣️
                  </div>
                </div>
              </div>
            )}

            {/* Routing status */}

            {routing && (
              <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                Updating road route...
              </div>
            )}

            {/* Error */}

            {error && (
              <div className="mt-3 rounded-xl bg-yellow-50 p-3 text-xs text-yellow-700">
                {error}
              </div>
            )}

            {/* Complete error */}

            {completeError && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {completeError}
              </div>
            )}

            {/* Divider */}

            <div className="my-4 h-px bg-gray-100" />

            {/* Information */}

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-gray-50 p-3 text-center">
                <p className="text-lg">
                  🚗
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Status
                </p>

                <p className="text-sm font-bold text-gray-900">
                  Started
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-3 text-center">
                <p className="text-lg">
                  📍
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  GPS
                </p>

                <p className="text-sm font-bold text-green-600">
                  Live
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-3 text-center">
                <p className="text-lg">
                  🛣️
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Route
                </p>

                <p className="text-sm font-bold text-gray-900">
                  {route.length > 1
                    ? "Active"
                    : "Finding"}
                </p>
              </div>
            </div>

            {/* Complete ride */}

            <button
              type="button"
              disabled={completing}
              onClick={completeRide}
              className="mt-4 w-full rounded-2xl bg-gray-900 py-4 font-semibold text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {completing
                ? "Completing Ride..."
                : "Complete Ride"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}