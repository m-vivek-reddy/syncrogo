import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Car, RefreshCw, MapPin, Clock, Users } from 'lucide-react';
import { apiClient } from '../api/client';
import { CashPaymentFlow } from '../components/payments/CashPaymentFlow';
import { CashFeesCard } from '../components/payments/CashFeesCard';
import { useAuth } from '../context/AuthContext';

interface TripBooking {
  id: number;
  ride_id?: number;
  passenger_id?: number;
  driver_id?: number;
  fare?: number;
  total_fare?: number;
  seats_booked?: number;
  status?: string;
  pickup_location?: string;
  dropoff_location?: string;
  destination_location?: string;
  completed_at?: string | null;
  created_at?: string | null;
  passenger?: { id?: number; full_name?: string; name?: string };
}

interface TripsResponse {
  success?: boolean;
  data?: TripBooking[];
  bookings?: TripBooking[];
  items?: TripBooking[];
}

type Mode = 'driver' | 'passenger';

const formatDate = (value: string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const statusChip = (status?: string): { label: string; cls: string } => {
  switch ((status || '').toUpperCase()) {
    case 'PENDING': return { label: 'Pending', cls: 'bg-amber-50 text-amber-700 ring-amber-200' };
    case 'ACCEPTED': return { label: 'Accepted', cls: 'bg-blue-50 text-blue-700 ring-blue-200' };
    case 'STARTED': return { label: 'Started', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' };
    case 'COMPLETED': return { label: 'Completed', cls: 'bg-green-50 text-green-700 ring-green-200' };
    case 'PAID': return { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
    case 'CANCELLED': return { label: 'Cancelled', cls: 'bg-red-50 text-red-700 ring-red-200' };
    default: return { label: status || 'Unknown', cls: 'bg-slate-50 text-slate-600 ring-slate-200' };
  }
};

export const MyTripsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [mode, setMode] = useState<Mode>('passenger');
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeRefreshKey, setFeeRefreshKey] = useState(0);

  const isDriverMode = mode === 'driver';

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const endpoint = isDriverMode ? '/bookings/driver/mine' : '/bookings/mine';
      const res = await apiClient.get<TripsResponse>(endpoint);
      const data = res.data.data ?? res.data.bookings ?? res.data.items ?? [];
      setBookings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not load your trips.');
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isDriverMode]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-green-600">Trips & Payments</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-800 font-display tracking-tight mt-1">My Trips</h1>
          <p className="mt-1 text-slate-500 text-sm sm:text-base">
            {isDriverMode
              ? 'Manage your ride offers, passenger bookings and cash fees.'
              : 'View your upcoming and completed rides, then pay after drop-off.'}
          </p>
        </div>

        {/* Mode switch */}
        <div className="mb-6 inline-flex gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-card">
          {(['passenger', 'driver'] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${mode === m ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
              {m === 'passenger' ? 'My Bookings' : 'My Ride Offers'}
            </button>
          ))}
        </div>

        {/* Driver cash fees */}
        {isDriverMode && (
          <div className="mb-8 max-w-md">
            <CashFeesCard refreshKey={feeRefreshKey} />
          </div>
        )}

        {/* Notifications */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />{error}
          </div>
        )}

        <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-4">
          <h3 className="text-base font-bold text-navy-800">
            {isDriverMode ? 'Passenger Bookings' : 'Your Bookings'} ({bookings.length})
          </h3>
          <button type="button" onClick={() => void load(true)} disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">Loading your trips...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && bookings.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3"><Car className="w-6 h-6" /></div>
            <h4 className="text-base font-bold text-navy-800 mb-1">No trips yet</h4>
            <p className="text-xs text-slate-400 mb-5">
              {isDriverMode ? 'Passenger bookings on your rides will appear here.' : 'Book a ride to see it here.'}
            </p>
            <a href="/find-ride" className="px-4 py-2 text-white rounded-xl text-xs font-bold" style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)' }}>
              Find a Ride
            </a>
          </div>
        )}

        {/* Trip cards */}
        <div className="space-y-4">
          {bookings.map((booking) => {
            const chip = statusChip(booking.status);
            const status = (booking.status || '').toUpperCase();
            const fare = Number(booking.fare ?? booking.total_fare ?? 0);
            const isCompleted = status === 'COMPLETED' || status === 'PAID';

            return (
              <div key={booking.id} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${chip.cls}`}>
                        {chip.label}
                      </span>
                      {isCompleted && booking.completed_at && (
                        <span className="text-[11px] text-slate-400">Completed {formatDate(booking.completed_at)}</span>
                      )}
                    </div>
                    <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                      <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-green-600" /><span className="font-semibold">{booking.pickup_location || 'Pickup'}</span></p>
                      <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-red-400" /><span className="font-semibold">{booking.dropoff_location || booking.destination_location || 'Destination'}</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-navy-800 font-display">₹{fare}</div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                      <Users className="w-3 h-3" />{booking.seats_booked ?? 1} seat
                    </span>
                  </div>
                </div>

                {/* Payment zone for completed rides */}
                {isCompleted && fare > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    {status === 'PAID' ? (
                      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                        <p className="text-sm font-bold text-green-800">
                          Payment settled — ₹{fare} received. Thanks for riding with SyncroGo!
                        </p>
                      </div>
                    ) : isDriverMode ? (
                      <CashPaymentFlow
                        mode="driver"
                        bookingId={booking.id}
                        fare={fare}
                        passengerName={booking.passenger?.full_name || booking.passenger?.name || 'Passenger'}
                        onChanged={() => { void load(true); setFeeRefreshKey((k) => k + 1); }}
                      />
                    ) : (
                      <CashPaymentFlow
                        mode="passenger"
                        bookingId={booking.id}
                        fare={fare}
                        onChanged={() => void load(true)}
                      />
                    )}
                  </div>
                )}

                {/* Non-completed hints */}
                {!isCompleted && status !== 'CANCELLED' && (
                  <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {status === 'PENDING' ? 'Waiting for driver confirmation.' : 'Payment opens after the ride is completed.'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MyTripsPage;
