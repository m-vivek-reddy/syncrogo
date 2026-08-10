
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function Trips() {
  const navigate = useNavigate();
  const { isDriverMode } = useAppStore();

  const title = isDriverMode ? 'Driver Trip History' : 'Trip History';
  const subtitle = isDriverMode
    ? 'Manage your ride offers and passenger bookings.'
    : 'View your completed and upcoming rides.';
  const emptyTitle = isDriverMode ? 'No offers yet' : 'No trips yet';
  const emptyMessage = isDriverMode
    ? 'Publish your first ride offer to see it here.'
    : 'Book your first ride to see your trip history here.';
  const buttonLabel = isDriverMode ? 'Offer a Ride' : 'Find a Ride';
  const buttonRoute = isDriverMode ? '/offer-ride' : '/home';

  return (
    <div className="flex-grow flex flex-col p-6 pb-24 overflow-y-auto bg-slate-50 animate-fade-in w-full h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-poppins font-bold text-syncro-dark">
          {title}
        </h1>

        <p className="mt-1 text-slate-500">
          {subtitle}
        </p>
      </div>

      {/* Empty State */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mb-6 text-6xl">🚗</div>

        <h2 className="text-2xl font-bold text-slate-900">
          {emptyTitle}
        </h2>

        <p className="mt-2 max-w-sm text-center text-slate-500">
          {emptyMessage}
        </p>

        <button
          onClick={() => navigate(buttonRoute)}
          className="mt-8 rounded-xl bg-emerald-500 px-8 py-3 font-semibold text-white hover:bg-emerald-600"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}