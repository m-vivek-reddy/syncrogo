// src/pages/RideNavigationPage.tsx

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import RideNavigation from "../components/ride/RideNavigation";

export default function RideNavigationPage() {
  const { bookingId } =
    useParams<{
      bookingId: string;
    }>();

  const navigate = useNavigate();

  // ==========================================================
  // INVALID BOOKING ID
  // ==========================================================

  if (!bookingId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="mb-4 text-5xl">
            ⚠️
          </div>

          <h1 className="text-xl font-bold text-gray-900">
            Invalid booking
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            No booking ID was provided.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/trips")
            }
            className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white"
          >
            Back to Trips
          </button>
        </div>
      </div>
    );
  }

  const numericBookingId =
    Number(bookingId);

  // ==========================================================
  // INVALID NUMBER
  // ==========================================================

  if (
    !Number.isFinite(numericBookingId) ||
    numericBookingId <= 0
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="mb-4 text-5xl">
            ⚠️
          </div>

          <h1 className="text-xl font-bold text-gray-900">
            Invalid booking ID
          </h1>

          <button
            type="button"
            onClick={() =>
              navigate("/trips")
            }
            className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white"
          >
            Back to Trips
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  return (
    <div className="h-screen w-full overflow-hidden">
      <RideNavigation
        bookingId={numericBookingId}
        onComplete={() =>
          navigate("/trips")
        }
      />
    </div>
  );
}