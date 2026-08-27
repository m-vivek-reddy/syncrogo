import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { apiClient } from "../api/client";
import { PaymentButton } from "../components/PaymentButton";
import RideReceipt from "./RideReceipt";

interface Booking {
  id: number;
  booking_id?: number;

  ride_id?: number;

  passenger_id?: number;
  driver_id?: number;

  pickup_location?: string;
  pickup_lat?: number;
  pickup_lon?: number;

  dropoff_location?: string;
  dropoff_lat?: number;
  dropoff_lon?: number;

  destination_location?: string;

  fare?: number;

  status?: string;

  passenger_lat?: number | null;
  passenger_lon?: number | null;

  driver_lat?: number | null;
  driver_lon?: number | null;

  otp_verified?: boolean | string;

  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;

  // Some backend responses may wrap ride information
  ride?: {
    id?: number;
    pickup_location?: string;
    dropoff_location?: string;
    pickup_lat?: number;
    pickup_lon?: number;
    dropoff_lat?: number;
    dropoff_lon?: number;
    fare?: number;
    driver_id?: number;
  };

  driver?: {
    id?: number;
    full_name?: string;
    name?: string;
  };

  passenger?: {
    id?: number;
    full_name?: string;
    name?: string;
  };
}

interface ApiResponse {
  success?: boolean;
  data?: Booking[] | Booking;
  bookings?: Booking[];
  items?: Booking[];
  results?: Booking[];
  message?: string;
}

type TripMode = "driver" | "passenger";

// Keep recently loaded trips available while users move between screens.
const tripCache: Partial<Record<TripMode, Booking[]>> = {};

function getBookingsFromResponse(responseData: ApiResponse | Booking[]): Booking[] {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData.data)) {
    return responseData.data;
  }

  if (Array.isArray(responseData.bookings)) {
    return responseData.bookings;
  }

  if (Array.isArray(responseData.items)) {
    return responseData.items;
  }

  if (Array.isArray(responseData.results)) {
    return responseData.results;
  }

  if (responseData.data && !Array.isArray(responseData.data)) {
    return [responseData.data];
  }

  return [];
}

function formatDate(date?: string | null) {
  if (!date) {
    return "Date not available";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFare(fare?: number) {
  if (fare === undefined || fare === null) {
    return "₹--";
  }

  return `₹${Number(fare).toFixed(0)}`;
}

function getStatusClasses(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700";

    case "PAID":
      return "bg-violet-100 text-violet-700";

    case "STARTED":
      return "bg-blue-100 text-blue-700";

    case "ACCEPTED":
      return "bg-indigo-100 text-indigo-700";

    case "PENDING":
      return "bg-amber-100 text-amber-700";

    case "CANCELLED":
    case "REJECTED":
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusLabel(status?: string) {
  if (!status) {
    return "UNKNOWN";
  }

  return status.replace(/_/g, " ");
}

export default function Trips() {
  const navigate = useNavigate();

  const { isDriverMode } = useAppStore();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ booking: Booking; paymentId: number } | null>(null);

  /*
   * ============================================================
   * LOAD BOOKINGS
   * ============================================================
   */

  const loadBookings = useCallback(
    async (showRefreshing = false) => {
      const mode: TripMode = isDriverMode ? "driver" : "passenger";
      const cachedBookings = tripCache[mode];

      if (!showRefreshing && cachedBookings) {
        setBookings(cachedBookings);
        setLoading(false);
        return;
      }

      try {
        if (showRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        /*
         * Passenger:
         * GET /api/v1/bookings/my-rides
         *
         * Driver:
         * GET /driver/bookings
         */

        const endpoint = isDriverMode
          ? "/api/v1/bookings/driver/mine"
          : "/api/v1/bookings/mine";

        const response = await apiClient.get(endpoint);

        const data = response.data as ApiResponse | Booking[];

        const normalizedBookings = getBookingsFromResponse(data);

        setBookings(normalizedBookings);
        tripCache[mode] = normalizedBookings;
      } catch (err: any) {
        console.error("Failed to load trips:", err);

        const backendMessage =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to load your trips.";

        setError(backendMessage);
        if (!cachedBookings) {
          setBookings([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isDriverMode]
  );

  /*
   * ============================================================
   * LOAD WHEN PAGE OPENS / DRIVER MODE CHANGES
   * ============================================================
   */

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  /*
   * ============================================================
   * OPEN ACTIVE RIDE
   * ============================================================
   */

  const openLiveRide = (booking: Booking) => {
    const bookingId = booking.id || booking.booking_id;

    if (!bookingId) {
      return;
    }

    /*
     * We will connect this to the full-screen live RideMap
     * route after the Trips page is working.
     */

    navigate(`/ride/${bookingId}`);
  };

  /*
   * ============================================================
   * CANCEL BOOKING
   * ============================================================
   */

  const cancelBooking = async (booking: Booking) => {
    const bookingId = booking.id || booking.booking_id;

    if (!bookingId) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiClient.post(`/api/v1/bookings/${bookingId}/cancel`);

      delete tripCache[isDriverMode ? "driver" : "passenger"];
      await loadBookings(true);
    } catch (err: any) {
      console.error("Failed to cancel booking:", err);

      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Unable to cancel this booking.";

      setError(message);
    }
  };

  /*
   * ============================================================
   * PAGE TEXT
   * ============================================================
   */

  const title = isDriverMode
    ? "Driver Trips"
    : "My Trips";

  const subtitle = isDriverMode
    ? "Manage your ride offers and passenger bookings."
    : "View your upcoming and completed rides.";

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="flex min-h-full flex-col bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <h1 className="text-3xl font-poppins font-bold text-syncro-dark mb-6">
            {title}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />

            <p className="mt-4 text-sm text-slate-500">
              Loading trips...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-poppins font-bold text-syncro-dark mb-6">
              {title}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadBookings(true)}
            disabled={refreshing}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="mx-6 mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-red-800">
                Unable to load trips
              </p>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadBookings(true)}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ======================================================
          EMPTY STATE
      ====================================================== */}

      {bookings.length === 0 && !error && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">
            🚗
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            {isDriverMode
              ? "No bookings yet"
              : "No trips yet"}
          </h2>

          <p className="mt-2 max-w-md text-center text-sm leading-6 text-slate-500">
            {isDriverMode
              ? "When passengers book one of your rides, their bookings will appear here."
              : "When you book a ride, your booking and trip information will appear here."}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                isDriverMode
                  ? "/offer-ride"
                  : "/find-ride"
              )
            }
            className="mt-7 rounded-xl bg-emerald-500 px-7 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-600"
          >
            {isDriverMode ? "Offer a Ride" : "Find a Ride"}
          </button>
        </div>
      )}

      {/* ======================================================
          BOOKINGS
      ====================================================== */}

      {bookings.length > 0 && (
        <div className="flex-1 px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-4xl space-y-4">
            {bookings.map((booking) => {
              const bookingId =
                booking.id || booking.booking_id;

              const rideId =
                booking.ride_id || booking.ride?.id;

              const pickup =
                booking.pickup_location ||
                booking.ride?.pickup_location ||
                "Pickup location";

              const destination =
                booking.dropoff_location ||
                booking.destination_location ||
                booking.ride?.dropoff_location ||
                "Destination";

              const fare =
                booking.fare ??
                booking.ride?.fare;

              const status =
                booking.status?.toUpperCase() ||
                "UNKNOWN";

              const isActive =
                status === "STARTED" ||
                status === "ACCEPTED";

              const isPending =
                status === "PENDING";

              const isCompleted =
                status === "COMPLETED";

              const isCancelled =
                status === "CANCELLED" ||
                status === "REJECTED";

              return (
                <div
                  key={bookingId}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* ==================================================
                      TOP
                  ================================================== */}

                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Booking #{bookingId}
                      </p>

                      {rideId && (
                        <p className="mt-1 text-xs text-slate-400">
                          Ride #{rideId}
                        </p>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                        status
                      )}`}
                    >
                      {getStatusLabel(status)}
                    </span>
                  </div>

                  {/* ==================================================
                      ROUTE
                  ================================================== */}

                  <div className="px-5 py-5">
                    <div className="relative">
                      {/* Vertical route line */}

                      <div className="absolute left-[7px] top-3 h-[calc(100%-24px)] w-0.5 bg-slate-200" />

                      {/* Pickup */}

                      <div className="relative flex gap-4">
                        <div className="z-10 mt-1 h-4 w-4 rounded-full border-4 border-emerald-500 bg-white" />

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-400">
                            PICKUP
                          </p>

                          <p className="mt-1 font-semibold text-slate-900">
                            {pickup}
                          </p>
                        </div>
                      </div>

                      {/* Destination */}

                      <div className="relative mt-7 flex gap-4">
                        <div className="z-10 mt-1 h-4 w-4 rounded-full border-4 border-red-500 bg-white" />

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-400">
                            DESTINATION
                          </p>

                          <p className="mt-1 font-semibold text-slate-900">
                            {destination}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ==================================================
                      DETAILS
                  ================================================== */}

                  <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-400">
                        Fare
                      </p>

                      <p className="mt-1 font-bold text-slate-900">
                        {formatFare(fare)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Created
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {formatDate(booking.created_at)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        OTP
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {booking.otp_verified === true ||
                        booking.otp_verified === "true"
                          ? "Verified"
                          : isActive
                          ? "Not verified"
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* ==================================================
                      ACTIVE RIDE
                  ================================================== */}

                  {isActive && (
                    <div className="border-t border-blue-100 bg-blue-50 px-5 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-bold text-blue-900">
                            {status === "STARTED"
                              ? "Ride is currently active"
                              : "Ride accepted"}
                          </p>

                          <p className="mt-1 text-sm text-blue-700">
                            {status === "STARTED"
                              ? "Open the live map to track the trip."
                              : isDriverMode
                              ? "Ask the passenger for their OTP when they enter the vehicle."
                              : "Wait for the driver to start the ride."}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            openLiveRide(booking)
                          }
                          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                        >
                          {status === "STARTED"
                            ? "Open Live Map"
                            : "View Ride"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ==================================================
                      PENDING
                  ================================================== */}

                  {isPending && (
                    <div className="border-t border-amber-100 bg-amber-50 px-5 py-4">
                      <p className="font-semibold text-amber-800">
                        Waiting for driver confirmation
                      </p>

                      <p className="mt-1 text-sm text-amber-700">
                        Your booking request has been sent to the driver.
                      </p>

                      {!isDriverMode && (
                        <button
                          type="button"
                          onClick={() =>
                            cancelBooking(booking)
                          }
                          className="mt-3 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  )}

                  {/* ==================================================
                      COMPLETED
                  ================================================== */}

                  {isCompleted && (
                    <div className="border-t border-emerald-100 bg-emerald-50 px-5 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-emerald-800">
                            Trip completed
                          </p>

                          {booking.completed_at && (
                            <p className="mt-1 text-sm text-emerald-700">
                              Completed{" "}
                              {formatDate(
                                booking.completed_at
                              )}
                            </p>
                          )}
                        </div>

                        {!isDriverMode && bookingId && rideId && fare !== undefined && (
                          <PaymentButton
                            rideId={rideId}
                            bookingId={bookingId}
                            finalFare={fare}
                            passengerEmail=""
                            onPaid={(paymentId) => {
                              setReceipt({ booking, paymentId });
                              void loadBookings(true);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* ==================================================
                      CANCELLED
                  ================================================== */}

                  {isCancelled && (
                    <div className="border-t border-red-100 bg-red-50 px-5 py-4">
                      <p className="font-semibold text-red-800">
                        This booking is no longer active.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {receipt && (
        <RideReceipt
          rideDetails={{
            pickup: receipt.booking.pickup_location || "Pickup location",
            dropoff: receipt.booking.dropoff_location || receipt.booking.destination_location || "Destination",
            driverName: receipt.booking.driver?.full_name || receipt.booking.driver?.name || "Driver",
            amountPaid: receipt.booking.fare || 0,
            transactionId: String(receipt.paymentId),
          }}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
