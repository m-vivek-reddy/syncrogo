import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { apiClient } from "../api/client";
import { calculateFareWithBackend } from "../api/auth";
import { getRoadRoute } from "../services/routing";
import "leaflet/dist/leaflet.css";

type PlaceResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

function DestinationMapPicker({
  initialPosition,
  onSelect,
}: {
  initialPosition: [number, number];
  onSelect: (position: [number, number]) => void;
}) {
  useMapEvents({
    click: (event) => onSelect([event.latlng.lat, event.latlng.lng]),
  });

  return <CircleMarker center={initialPosition} radius={9} pathOptions={{ color: "#059669" }} />;
}

interface RideForm {
  pickup_location: string;
  pickup_lat: string;
  pickup_lon: string;

  dropoff_location: string;
  dropoff_lat: string;
  dropoff_lon: string;

  departure_time: string;
  available_seats: string;
  fare: string;
  vehicle_type: string;
}

export default function OfferRide() {
  const navigate = useNavigate();

  const [form, setForm] = useState<RideForm>({
    pickup_location: "",
    pickup_lat: "",
    pickup_lon: "",

    dropoff_location: "",
    dropoff_lat: "",
    dropoff_lon: "",

    departure_time: "",
    available_seats: "1",
    fare: "",

    vehicle_type: "car",
  });

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [destinationResults, setDestinationResults] = useState<PlaceResult[]>([]);
  const [searchingDestination, setSearchingDestination] = useState(false);
  const [destinationSearchAttempted, setDestinationSearchAttempted] = useState(false);
  const [showDestinationMap, setShowDestinationMap] = useState(false);
  const [mapDestination, setMapDestination] = useState<[number, number] | null>(null);
  const skipNextDestinationSearch = useRef(false);
  const [maximumFare, setMaximumFare] = useState<number | null>(null);
  const [estimatedTripCost, setEstimatedTripCost] = useState<number | null>(null);
  const [calculatingFare, setCalculatingFare] = useState(false);
  const [docsPending, setDocsPending] = useState(false);
  const [docsPendingMessage, setDocsPendingMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const checkDocuments = async () => {
      try {
        const res = await apiClient.get("/api/v1/documents/");
        const docs = res.data?.documents || (Array.isArray(res.data) ? res.data : []);
        const pendingDocs = docs.filter((d: any) => (d.status || "").toLowerCase() === "pending");
        if (pendingDocs.length > 0) {
          if (active) {
            setDocsPending(true);
            setDocsPendingMessage("Your driver documents are currently pending verification. You cannot offer a ride until your documents are approved by the administrator.");
          }
        } else if (docs.length === 0) {
          if (active) {
            setDocsPending(true);
            setDocsPendingMessage("You must upload and verify your driver documents before offering a ride.");
          }
        } else {
          const hasApproved = docs.some((d: any) => ["approved", "verified"].includes((d.status || "").toLowerCase()));
          if (!hasApproved && active) {
            setDocsPending(true);
            setDocsPendingMessage("Your driver documents have not been approved yet. You cannot offer a ride until your documents are verified.");
          }
        }
      } catch {
        // Keep active
      }
    };
    void checkDocuments();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const pickupLat = Number(form.pickup_lat);
    const pickupLon = Number(form.pickup_lon);
    const dropoffLat = Number(form.dropoff_lat);
    const dropoffLon = Number(form.dropoff_lon);

    if (
      ![form.pickup_lat, form.pickup_lon, form.dropoff_lat, form.dropoff_lon].every((value) => value.trim() !== "") ||
      ![pickupLat, pickupLon, dropoffLat, dropoffLon].every(Number.isFinite)
    ) {
      setMaximumFare(null);
      setEstimatedTripCost(null);
      return;
    }

    let active = true;
    const calculateMaximumFare = async () => {
      setCalculatingFare(true);
      try {
        const route = await getRoadRoute(
          { latitude: pickupLat, longitude: pickupLon },
          { latitude: dropoffLat, longitude: dropoffLon },
        );
        const result = await calculateFareWithBackend(
          route.distanceKm,
          form.vehicle_type === "bike" ? "bike" : "carpool",
          route.durationMinutes,
        );
        if (!active || !result.success) return;

        // The driver shares the full trip cost only across passenger seats
        // offered; the driver's own seat is never included in this division.
        const tripCost = Number(result.data.distance_fare);
        const seatsOffered = Math.max(Number(form.available_seats), 1);
        const farePerPassenger = Math.ceil(tripCost / seatsOffered);

        setEstimatedTripCost(tripCost);
        setMaximumFare(farePerPassenger);
        setForm((previous) => ({ ...previous, fare: farePerPassenger.toFixed(2) }));
      } catch (fareError) {
        if (active) {
          console.error("Unable to calculate the maximum fare:", fareError);
          setMaximumFare(null);
          setEstimatedTripCost(null);
        }
      } finally {
        if (active) setCalculatingFare(false);
      }
    };

    void calculateMaximumFare();
    return () => { active = false; };
  }, [form.pickup_lat, form.pickup_lon, form.dropoff_lat, form.dropoff_lon, form.vehicle_type, form.available_seats]);

  const maxAllowedFare = maximumFare !== null ? Math.ceil(maximumFare * 1.15) : null;
  const fareExceedsMaximum = maxAllowedFare !== null && Number(form.fare) > maxAllowedFare;

  useEffect(() => {
    if (skipNextDestinationSearch.current) {
      skipNextDestinationSearch.current = false;
      return;
    }

    const query = form.dropoff_location.trim();
    if (query.length < 3) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchingDestination(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=6&q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Destination search failed");
        setDestinationResults((await response.json()) as PlaceResult[]);
        setDestinationSearchAttempted(true);
      } catch (searchError) {
        if ((searchError as Error).name !== "AbortError") {
          console.error("Destination search failed:", searchError);
          setDestinationResults([]);
          setDestinationSearchAttempted(true);
        }
      } finally {
        if (!controller.signal.aborted) setSearchingDestination(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [form.dropoff_location]);

  const setDestination = (address: string, lat: number, lon: number) => {
    skipNextDestinationSearch.current = true;
    setForm((previous) => ({
      ...previous,
      dropoff_location: address,
      dropoff_lat: lat.toString(),
      dropoff_lon: lon.toString(),
    }));
    setDestinationResults([]);
    setDestinationSearchAttempted(false);
  };

  const selectMapDestination = async (position: [number, number]) => {
    setMapDestination(position);
    const [lat, lon] = position;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
      );
      const data = response.ok ? await response.json() : null;
      setDestination(data?.display_name ?? `${lat.toFixed(6)}, ${lon.toFixed(6)}`, lat, lon);
    } catch {
      setDestination(`${lat.toFixed(6)}, ${lon.toFixed(6)}`, lat, lon);
    }
  };

  // ============================================================
  // HANDLE INPUT
  // ============================================================

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "dropoff_location" && value.trim().length < 3) {
      setDestinationResults([]);
      setDestinationSearchAttempted(false);
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ============================================================
  // GET CURRENT LOCATION
  // ============================================================

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(
        "Geolocation is not supported by your browser."
      );
      return;
    }

    setLocationLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setForm((prev) => ({
          ...prev,
          pickup_lat: lat.toString(),
          pickup_lon: lon.toString(),
        }));

        setLocationLoading(false);

        // Try reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          );

          if (response.ok) {
            const data = await response.json();

            const address =
              data?.display_name ||
              `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

            setForm((prev) => ({
              ...prev,
              pickup_location: address,
            }));
          }
        } catch (err) {
          console.error(
            "Reverse geocoding failed:",
            err
          );

          setForm((prev) => ({
            ...prev,
            pickup_location: `${lat.toFixed(
              6
            )}, ${lon.toFixed(6)}`,
          }));
        }
      },
      (err) => {
        console.error("Location error:", err);

        setLocationLoading(false);

        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError(
              "Location permission was denied. Please allow location access."
            );
            break;

          case err.POSITION_UNAVAILABLE:
            setError(
              "Your current location is unavailable."
            );
            break;

          case err.TIMEOUT:
            setError(
              "Location request timed out. Please try again."
            );
            break;

          default:
            setError(
              "Unable to get your current location."
            );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // ============================================================
  // GET CURRENT DATE/TIME MINIMUM
  // ============================================================

  useEffect(() => {
    const now = new Date();

    now.setMinutes(
      now.getMinutes() -
        now.getTimezoneOffset()
    );

    setForm((prev) => ({
      ...prev,
      departure_time:
        prev.departure_time ||
        now.toISOString().slice(0, 16),
    }));
  }, []);

  // ============================================================
  // VALIDATION
  // ============================================================

  const validateForm = () => {
    if (!form.pickup_location.trim()) {
      return "Please enter your pickup location.";
    }

    if (!form.dropoff_location.trim()) {
      return "Please enter your destination.";
    }

    if (!form.pickup_lat || !form.pickup_lon) {
      return "Please provide the pickup location coordinates.";
    }

    if (!form.dropoff_lat || !form.dropoff_lon) {
      return "Please provide the destination coordinates.";
    }

    if (!form.departure_time) {
      return "Please select a departure date and time.";
    }

    if (
      Number(form.available_seats) < 1 ||
      Number(form.available_seats) > 10
    ) {
      return "Available seats must be between 1 and 10.";
    }

    if (Number(form.fare) < 0) {
      return "Fare cannot be negative.";
    }

    if (fareExceedsMaximum && maxAllowedFare !== null) {
      return `Fare cannot exceed 15% above the recommended fare rate of ₹${maxAllowedFare.toFixed(2)}.`;
    }

    if (docsPending) {
      return docsPendingMessage || "Your driver documents are currently pending approval. You cannot offer a ride until your documents are verified.";
    }

    return null;
  };

  // ============================================================
  // SUBMIT RIDE
  // ============================================================

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      // The backend requires the real road distance (distance_km) to
      // validate the offered fare, so resolve the route before publishing.
      let route;

      try {
        route = await getRoadRoute(
          {
            latitude: Number(form.pickup_lat),
            longitude: Number(form.pickup_lon),
          },
          {
            latitude: Number(form.dropoff_lat),
            longitude: Number(form.dropoff_lon),
          },
        );
      } catch (routeError) {
        console.error(
          "Unable to calculate the road route:",
          routeError
        );

        setError(
          "Unable to calculate the road route for your trip. Please verify your pickup and destination and try again."
        );
        return;
      }

      const payload = {
        pickup_location:
          form.pickup_location.trim(),

        pickup_lat: Number(form.pickup_lat),
        pickup_lon: Number(form.pickup_lon),

        dropoff_location:
          form.dropoff_location.trim(),

        dropoff_lat: Number(form.dropoff_lat),
        dropoff_lon: Number(form.dropoff_lon),

        departure_time: new Date(
          form.departure_time
        ).toISOString(),

        distance_km: route.distanceKm,

        available_seats: Number(
          form.available_seats
        ),

        vehicle_type: form.vehicle_type,
        price_per_seat: Number(form.fare),
        gender_preference: "any",
      };

      console.log(
        "Creating ride:",
        payload
      );

      const response = await apiClient.post(
        "/rides/offer",
        payload
      );

      console.log(
        "Ride created:",
        response.data
      );

      setSuccess(
        "Your ride has been offered successfully!"
      );

      setTimeout(() => {
        navigate("/trips");
      }, 1000);
    } catch (err: any) {
      console.error(
        "Failed to offer ride:",
        err
      );

      if (err?.response?.status === 401) {
        setError(
          "Your session has expired. Please login again."
        );
      } else if (
        err?.response?.status === 403
      ) {
        setError(
          "You are not authorized to offer a ride."
        );
      } else if (
        err?.response?.status === 422
      ) {
        const detail =
          err?.response?.data?.detail;

        if (Array.isArray(detail)) {
          setError(
            detail
              .map(
                (item: any) => {
                  const field =
                    Array.isArray(item?.loc)
                      ? item.loc[item.loc.length - 1]
                      : null;

                  return field
                    ? `${field}: ${
                        item?.msg || "Invalid input"
                      }`
                    : item?.msg || "Invalid input";
                }
              )
              .join(", ")
          );
        } else {
          setError(
            detail ||
              "Please check the information you entered."
          );
        }
      } else {
        setError(
          err?.response?.data?.detail ||
            "Unable to offer the ride. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="min-h-full bg-slate-50">
      {/* HEADER */}

      <div className="border-b border-slate-200 bg-white px-6 py-6">
        <div className="mx-auto max-w-4xl">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold text-slate-900">
            Offer a Ride
          </h1>

          <p className="mt-1 text-slate-500">
            Share your journey with passengers
            traveling the same way.
          </p>
        </div>
      </div>

      {/* CONTENT */}

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* PENDING DOCUMENTS WARNING */}
          {docsPending && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xl">⏳</span>
                <h3 className="font-bold text-amber-900">Driver Documents Pending Verification</h3>
              </div>
              <p className="mt-1 text-sm text-amber-800">
                {docsPendingMessage || "Your driver documents are currently under review. You cannot publish ride offers until they are verified and approved."}
              </p>
              <button
                type="button"
                onClick={() => navigate("/documents")}
                className="mt-3 inline-block font-semibold text-amber-900 underline hover:text-amber-950 text-sm"
              >
                View or upload documents →
              </button>
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              ⚠️ {error}
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              ✓ {success}
            </div>
          )}

          {/* ROUTE */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Journey
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter where your ride starts and
              where you are going.
            </p>

            <div className="mt-6 space-y-5">
              {/* PICKUP */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Pickup location
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    name="pickup_location"
                    value={
                      form.pickup_location
                    }
                    onChange={handleChange}
                    placeholder="Enter pickup location"
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                  <button
                    type="button"
                    onClick={
                      getCurrentLocation
                    }
                    disabled={
                      locationLoading
                    }
                    className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {locationLoading
                      ? "..."
                      : "📍 GPS"}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    name="pickup_lat"
                    value={form.pickup_lat}
                    onChange={handleChange}
                    placeholder="Latitude"
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  />

                  <input
                    type="number"
                    step="any"
                    name="pickup_lon"
                    value={form.pickup_lon}
                    onChange={handleChange}
                    placeholder="Longitude"
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* DESTINATION */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Destination
                </label>

                <div className="relative">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="dropoff_location"
                      value={form.dropoff_location}
                      onChange={handleChange}
                      placeholder="Search destination"
                      autoComplete="off"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDestinationMap(true)}
                      className="shrink-0 rounded-xl border border-emerald-500 px-4 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Select on map
                    </button>
                  </div>

                  {(destinationResults.length > 0 || searchingDestination || destinationSearchAttempted) && (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                      {searchingDestination && <p className="px-3 py-2 text-sm text-slate-500">Searching locations…</p>}
                      {destinationResults.map((place) => (
                        <button
                          key={place.place_id}
                          type="button"
                          onClick={() => setDestination(place.display_name, Number(place.lat), Number(place.lon))}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50"
                        >
                          {place.display_name}
                        </button>
                      ))}
                      {!searchingDestination && destinationResults.length === 0 && (
                        <p className="px-3 py-2 text-sm text-slate-500">No matching places found. Try a more specific name or choose it on the map.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    name="dropoff_lat"
                    value={form.dropoff_lat}
                    onChange={handleChange}
                    placeholder="Latitude"
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  />

                  <input
                    type="number"
                    step="any"
                    name="dropoff_lon"
                    value={form.dropoff_lon}
                    onChange={handleChange}
                    placeholder="Longitude"
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {showDestinationMap && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
              <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 p-4">
                  <div>
                    <h3 className="font-bold text-slate-900">Choose destination on the map</h3>
                    <p className="text-sm text-slate-500">Click the exact destination to set its location.</p>
                  </div>
                  <button type="button" onClick={() => setShowDestinationMap(false)} className="rounded-lg px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100">Close</button>
                </div>
                <div className="h-[460px]">
                  <MapContainer center={mapDestination ?? [17.385, 78.487]} zoom={mapDestination ? 15 : 11} className="h-full w-full">
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <DestinationMapPicker initialPosition={mapDestination ?? [17.385, 78.487]} onSelect={selectMapDestination} />
                    {mapDestination && <CircleMarker center={mapDestination} radius={9} pathOptions={{ color: "#059669" }} />}
                  </MapContainer>
                </div>
                <div className="flex justify-end gap-3 p-4">
                  <button type="button" onClick={() => setShowDestinationMap(false)} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600">Done</button>
                </div>
              </div>
            </div>
          )}

          {/* RIDE DETAILS */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Ride Details
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {/* DATE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Departure date & time
                </label>

                <input
                  type="datetime-local"
                  name="departure_time"
                  value={
                    form.departure_time
                  }
                  onChange={handleChange}
                  min={form.departure_time}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* SEATS */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Available seats
                </label>

                <select
                  name="available_seats"
                  value={
                    form.available_seats
                  }
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="1">
                    1 seat
                  </option>

                  <option value="2">
                    2 seats
                  </option>

                  <option value="3">
                    3 seats
                  </option>

                  <option value="4">
                    4 seats
                  </option>

                  <option value="5">
                    5 seats
                  </option>

                  <option value="6">
                    6 seats
                  </option>
                </select>
              </div>

              {/* VEHICLE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Vehicle type
                </label>

                <select
                  name="vehicle_type"
                  value={form.vehicle_type}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="car">
                    🚗 Car
                  </option>

                  <option value="bike">
                    🏍️ Bike
                  </option>
                </select>
              </div>

              {/* FARE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Fare per passenger
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                    ₹
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="fare"
                    value={form.fare}
                    readOnly
                    aria-describedby="fare-calculation"
                    placeholder="Select pickup and destination"
                    className="w-full cursor-not-allowed rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 pl-9 font-semibold text-emerald-800 outline-none"
                  />
                </div>
                {calculatingFare && <p className="mt-2 text-xs font-medium text-slate-500">Calculating maximum fare from distance and travel time…</p>}
                {maximumFare !== null && estimatedTripCost !== null && !calculatingFare && (
                  <div id="fare-calculation" className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <p className="font-semibold">Estimated trip cost: ₹{estimatedTripCost.toFixed(0)}</p>
                    <p className="mt-1">Recommended fare per seat: <strong>₹{maximumFare.toFixed(0)}</strong> (Max allowed +15%: <strong>₹{(maximumFare * 1.15).toFixed(0)}</strong>)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* LOCATION INFO */}

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex gap-3">
              <div className="text-xl">
                📍
              </div>

              <div>
                <h3 className="font-semibold text-blue-900">
                  Location information
                </h3>

                <p className="mt-1 text-sm text-blue-700">
                  SyncroGo uses your pickup and
                  destination coordinates to match
                  passengers traveling along a
                  similar route.
                </p>
              </div>
            </div>
          </div>

          {/* SUBMIT */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || docsPending}
              className="rounded-xl bg-emerald-500 px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Offering Ride..."
                : docsPending
                ? "⏳ Documents Pending"
                : "🚗 Offer Ride"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
