import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bike, Car, CheckCircle2, Clock, LocateFixed, MapPin, ShieldAlert, FileLock2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { publishRideApi } from '../api/rides';
import { useAuth } from '../context/AuthContext';
import { InteractiveRouteMap } from '../components/common/InteractiveRouteMap';
import { LocationAutocomplete } from '../components/common/LocationAutocomplete';

const initialForm = {
  pickup_location: '', pickup_lat: '', pickup_lon: '',
  dropoff_location: '', dropoff_lat: '', dropoff_lon: '',
  distance_km: '', vehicle_type: 'car' as 'car' | 'bike',
  available_seats: '1', gender_preference: 'No preference',
  price_per_seat: '', departure_time: '',
};
const requiredDriverDocuments = [
  { type: 'license', label: 'Driving licence' },
  { type: 'rc_book', label: 'Vehicle registration (RC)' },
] as const;

const calculateDistanceKm = (pLat: number, pLon: number, dLat: number, dLon: number) => {
  const R = 6371, dLat2 = (dLat - pLat) * Math.PI / 180, dLon2 = (dLon - pLon) * Math.PI / 180;
  const a = Math.sin(dLat2/2)**2 + Math.cos(pLat * Math.PI/180) * Math.cos(dLat * Math.PI/180) * Math.sin(dLon2/2)**2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2);
};

export const OfferRidePage: React.FC = () => {
  const { currentUser, openAuth } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState<'pickup' | 'dropoff' | null>(null);
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'dropoff'>('pickup');
  const [pendingPublish, setPendingPublish] = useState(false);
  const [fareOptions, setFareOptions] = useState<{ car: number | null; bike: number | null }>({ car: null, bike: null });
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [driverDocuments, setDriverDocuments] = useState<{ document_type: string; status: string }[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsCheckedUserId, setDocumentsCheckedUserId] = useState<number | null>(null);
  const [documentsError, setDocumentsError] = useState('');

  const loadDriverDocuments = useCallback(async () => {
    if (!currentUser) return;
    setDocumentsLoading(true);
    setDocumentsCheckedUserId(null);
    setDocumentsError('');
    try {
      const res = await apiClient.get('/api/v1/documents/');
      setDriverDocuments(res.data?.documents || []);
    } catch {
      setDocumentsError('Could not check your driver documents. Retry before publishing.');
    } finally {
      setDocumentsLoading(false);
      setDocumentsCheckedUserId(currentUser.id);
    }
  }, [currentUser]);

  useEffect(() => { void loadDriverDocuments(); }, [loadDriverDocuments]);
  useEffect(() => {
    if (!currentUser) {
      setDriverDocuments([]);
      setDocumentsCheckedUserId(null);
    }
  }, [currentUser]);

  const documentsChecked = !!currentUser && documentsCheckedUserId === currentUser.id;

  const docsReady = requiredDriverDocuments.every(({ type }) => {
    const latest = driverDocuments.find((document) => document.document_type === type);
    return ['approved', 'verified'].includes((latest?.status || '').toLowerCase());
  });

  const update = (key: keyof typeof form, value: string) => setForm((c) => ({ ...c, [key]: value }));

  const setPoint = (side: 'pickup' | 'dropoff', lat: number, lon: number, label?: string) => {
    setForm((c) => {
      const next = { ...c, ...(side === 'pickup' ? { pickup_lat: String(lat), pickup_lon: String(lon), ...(label ? { pickup_location: label } : {}) } : { dropoff_lat: String(lat), dropoff_lon: String(lon), ...(label ? { dropoff_location: label } : {}) }) };
      if (next.pickup_lat && next.pickup_lon && next.dropoff_lat && next.dropoff_lon)
        next.distance_km = calculateDistanceKm(+next.pickup_lat, +next.pickup_lon, +next.dropoff_lat, +next.dropoff_lon);
      return next;
    });
  };

  const geocode = async (side: 'pickup' | 'dropoff') => {
    const loc = side === 'pickup' ? form.pickup_location : form.dropoff_location;
    if (!loc.trim()) return;
    setGeocoding(side);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(loc)}`);
      const data = await res.json();
      if (!data[0]) throw new Error('Not found');
      setPoint(side, +data[0].lat, +data[0].lon, data[0].display_name);
      setStatus(null);
    } catch { setStatus({ type: 'error', message: `Could not locate that ${side} address. Try a more specific address.` }); }
    finally { setGeocoding(null); }
  };

  const reverseGeocode = async (side: 'pickup' | 'dropoff', lat: number, lon: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      setPoint(side, lat, lon, data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    } catch { setPoint(side, lat, lon, `${lat.toFixed(5)}, ${lon.toFixed(5)}`); }
  };

  const requestPickupLocation = () => {
    if (!navigator.geolocation) { setLocationMessage('Location not available.'); return; }
    setLocating(true); setLocationMessage(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setPoint('pickup', coords.latitude, coords.longitude, 'Current location'); setLocationMessage('Using your current pickup location.'); setLocating(false); void reverseGeocode('pickup', coords.latitude, coords.longitude); },
      () => { setLocationMessage('Allow location access to use your position.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const publish = async () => {
    if (!currentUser) { openAuth('login', '/offer-ride'); return; }
    if (!documentsChecked || documentsLoading || documentsError || !docsReady) {
      setStatus({ type: 'error', message: documentsError || 'Upload your driving licence and vehicle RC, then wait for approval before publishing.' });
      return;
    }
    if (!form.pickup_lat || !form.pickup_lon || !form.dropoff_lat || !form.dropoff_lon || !form.distance_km) {
      setStatus({ type: 'error', message: 'Set both route points first. Type an address or use your current location.' }); return;
    }
    setSaving(true); setStatus(null);
    const result = await publishRideApi({
      pickup_location: form.pickup_location, pickup_lat: +form.pickup_lat, pickup_lon: +form.pickup_lon,
      dropoff_location: form.dropoff_location, dropoff_lat: +form.dropoff_lat, dropoff_lon: +form.dropoff_lon,
      distance_km: +form.distance_km, vehicle_type: form.vehicle_type,
      available_seats: +form.available_seats, gender_preference: form.gender_preference,
      price_per_seat: form.price_per_seat ? +form.price_per_seat : undefined,
      departure_time: form.departure_time ? new Date(form.departure_time).toISOString() : undefined,
    });
    setSaving(false);
    setStatus({ type: result.success ? 'success' : 'error', message: result.message || 'Unable to publish.' });
    if (result.success) setForm(initialForm);
  };

  useEffect(() => { if (currentUser && pendingPublish && documentsChecked && !documentsLoading) { setPendingPublish(false); void publish(); } }, [currentUser, pendingPublish, documentsChecked, documentsLoading]);
  useEffect(() => { requestPickupLocation(); }, []);
  useEffect(() => {
    const dist = +form.distance_km;
    if (!dist || dist <= 0) { setFareOptions({ car: null, bike: null }); return; }
    const seats = Math.max(1, Number(form.available_seats) || 1);
    const car = Math.ceil(Math.round(dist * 10) / seats);
    const bike = Math.ceil(Math.round(dist * 5));
    setFareOptions({ car, bike });
    update('price_per_seat', String(form.vehicle_type === 'bike' ? bike : car));
  }, [form.distance_km, form.vehicle_type, form.available_seats]);

  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!currentUser) { setPendingPublish(true); openAuth('login', '/offer-ride'); return; } void publish(); };

  const pickup = useMemo(() => form.pickup_lat && form.pickup_lon ? { lat: +form.pickup_lat, lon: +form.pickup_lon, label: form.pickup_location } : undefined, [form.pickup_lat, form.pickup_lon, form.pickup_location]);
  const dropoff = useMemo(() => form.dropoff_lat && form.dropoff_lon ? { lat: +form.dropoff_lat, lon: +form.dropoff_lon, label: form.dropoff_location } : undefined, [form.dropoff_lat, form.dropoff_lon, form.dropoff_location]);

  const inputCls = 'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/15';
  const StatusIcon = status?.type === 'success' ? CheckCircle2 : ShieldAlert;

  return (
    <div className="min-h-screen bg-slate-50 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">Share your journey</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-navy-800 sm:text-5xl">Offer a Ride</h1>
          <p className="mt-3 text-slate-500">Publish a route for people heading your way. Type your pickup and destination — coordinates, distance and fare fill in automatically.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_0.65fr]">

          {/* Form */}
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">

            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><MapPin className="h-5 w-5" /></div>
              <div>
                <h2 className="font-display text-xl font-bold text-navy-800">Route details</h2>
                <p className="text-xs text-slate-400">Locations and coordinates fill automatically from the address search or your current location.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                <span className="flex items-center justify-between">
                  Pickup location
                  <button type="button" onClick={requestPickupLocation} disabled={locating}
                    className="flex items-center gap-1 text-[10px] font-bold text-green-700 normal-case">
                    <LocateFixed className={`h-3.5 w-3.5 ${locating ? 'animate-pulse' : ''}`} />
                    {locating ? 'Locating...' : 'Use my location'}
                  </button>
                </span>
                <LocationAutocomplete
                  value={form.pickup_location}
                  onChange={(value) => update('pickup_location', value)}
                  onFocus={() => setSelectionMode('pickup')}
                  onSelect={(location) => setPoint('pickup', location.lat, location.lon, location.label)}
                  near={pickup}
                  busy={geocoding === 'pickup'}
                  onBlurFallback={() => void geocode('pickup')}
                  placeholder="Type an address or landmark"
                />
                <span className="mt-1 block text-[10px] font-normal text-slate-400">{locationMessage}</span>
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Destination
                <LocationAutocomplete
                  value={form.dropoff_location}
                  onChange={(value) => update('dropoff_location', value)}
                  onFocus={() => setSelectionMode('dropoff')}
                  onSelect={(location) => setPoint('dropoff', location.lat, location.lon, location.label)}
                  near={pickup}
                  busy={geocoding === 'dropoff'}
                  onBlurFallback={() => void geocode('dropoff')}
                  placeholder="Type an address or landmark"
                />
              </label>

              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-sm">
                <span className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-0.5">Pickup coordinates</span>
                <span className="text-slate-600">{pickup ? `${pickup.lat.toFixed(6)}, ${pickup.lon.toFixed(6)}` : 'Auto-filled after location selection'}</span>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-sm">
                <span className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-0.5">Destination coordinates</span>
                <span className="text-slate-600">{dropoff ? `${dropoff.lat.toFixed(6)}, ${dropoff.lon.toFixed(6)}` : 'Auto-filled after location selection'}</span>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-sm">
                <span className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-0.5">Route distance</span>
                <span className="text-slate-600">{form.distance_km ? `${form.distance_km} km` : 'Auto-calculated from route points'}</span>
              </div>
              <label className="block text-sm font-semibold text-slate-700">
                Departure time
                <input required type="datetime-local" value={form.departure_time} onChange={(e) => update('departure_time', e.target.value)} className={inputCls} />
              </label>
            </div>

            <section className="mt-5 space-y-3" aria-label="Choose ride locations on the map">
              <div className="flex gap-2">
                {(['pickup', 'dropoff'] as const).map((side) => (
                  <button key={side} type="button" onClick={() => setSelectionMode(side)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold ${selectionMode === side ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-500'}`}>
                    {side === 'pickup' ? '1. Select pickup point' : '2. Select destination'}
                  </button>
                ))}
              </div>
              <InteractiveRouteMap
                centerLat={pickup?.lat ?? dropoff?.lat ?? 17.4435}
                centerLon={pickup?.lon ?? dropoff?.lon ?? 78.3772}
                pickup={pickup}
                dropoff={dropoff}
                vehicleType={form.vehicle_type}
                selectionLabel={`Tap map to set ${selectionMode === 'pickup' ? 'pickup' : 'destination'}`}
                onMapClick={({ lat, lon }) => {
                  setPoint(selectionMode, lat, lon, `${lat.toFixed(5)}, ${lon.toFixed(5)}`);
                  void reverseGeocode(selectionMode, lat, lon);
                }}
                onRouteDistance={(distance) => update('distance_km', distance.toFixed(2))}
                onLocate={requestPickupLocation}
                locating={locating}
                className="h-[390px] w-full"
              />
            </section>

            {/* Preferences */}
            <div className="mt-7 border-t border-slate-100 pt-6">
              <h2 className="font-display text-xl font-bold text-navy-800 mb-4">Ride preferences</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Vehicle type
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(['car', 'bike'] as const).map((v) => (
                      <button key={v} type="button" onClick={() => setForm((c) => ({ ...c, vehicle_type: v, ...(v === 'bike' ? { available_seats: '1' } : {}) }))}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold capitalize transition-all ${
                          form.vehicle_type === v ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}>
                        {v === 'car' ? <Car className="h-4 w-4" /> : <Bike className="h-4 w-4" />}{v}
                      </button>
                    ))}
                  </div>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Available seats
                  <input required type="number" min={1} max={form.vehicle_type === 'bike' ? 1 : 6} value={form.available_seats} onChange={(e) => update('available_seats', String(Math.max(1, Math.min(form.vehicle_type === 'bike' ? 1 : 6, Number(e.target.value) || 1))))} className={inputCls} />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Preference
                  <select value={form.gender_preference} onChange={(e) => update('gender_preference', e.target.value)} className={inputCls}>
                    <option>No preference</option><option>Women only</option><option>Men only</option>
                  </select>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Fare/share amount (INR)
                  <div className="relative mt-2">
                    <input type="number" min={0} value={form.price_per_seat} onChange={(e) => update('price_per_seat', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15" />
                  </div>
                  <span className="mt-1 block text-[11px] font-normal text-slate-400">Auto-calculated per seat at ₹10/km for cars and ₹5/km for bikes; adjust before publishing.</span>
                </label>

                <div className="rounded-xl border border-green-100 bg-green-50/60 p-3 text-xs sm:col-span-2">
                  <p className="font-bold text-green-900 mb-2">Estimated fare by vehicle</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['car', 'bike'] as const).map((v) => (
                      <div key={v} className={`rounded-lg border p-2 ${form.vehicle_type === v ? 'border-green-400 bg-white' : 'border-transparent bg-white/60'}`}>
                        <span className="block text-slate-400 capitalize">{v === 'car' ? 'Carpool' : 'Bikepool'}</span>
                        <strong className="text-base text-navy-800">{fareOptions[v] === null ? '--' : `₹${fareOptions[v]}`}</strong>
                      </div>
                    ))}
                  </div>
                  <span className="mt-2 block text-[11px] font-normal text-slate-400">Per seat, based on {form.distance_km ? `${form.distance_km} km` : 'your route'} and available seats.</span>
                </div>
              </div>
            </div>

            {status && (
              <div className={`mt-6 flex items-start gap-2 rounded-2xl p-4 text-sm ${status.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
                <StatusIcon className="mt-0.5 h-5 w-5 shrink-0" />{status.message}
              </div>
            )}

            <button disabled={saving || (!!currentUser && (!documentsChecked || documentsLoading || !!documentsError || !docsReady))}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)', boxShadow: '0 4px 14px rgba(7,126,233,0.28)' }}>
              {saving ? 'Publishing...' : currentUser && !documentsChecked ? 'Checking documents...' : 'Publish Ride'}<ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-2xl bg-navy-800 p-6 text-white shadow-md">
              <Clock className="mb-4 h-6 w-6 text-green-300" />
              <h2 className="font-display text-xl font-bold mb-2">A clear handoff</h2>
              <p className="text-sm leading-6 text-slate-300">Your published route is handled by the existing ride and booking system. Requests, seats, pricing, and eligibility stay with the backend.</p>
            </div>
            <div className={`rounded-2xl border p-5 text-sm leading-6 ${docsReady && currentUser ? 'border-green-200 bg-green-50 text-green-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              <ShieldAlert className="mb-3 h-5 w-5 text-amber-600" />
              <strong>Driver documents</strong>
              {!currentUser ? (
                <p className="mt-1">Sign in to check your verification status and upload required documents.</p>
              ) : documentsLoading ? (
                <p className="mt-1">Checking your driving licence and vehicle RC status...</p>
              ) : docsReady && !documentsError ? (
                <div className="mt-1 space-y-3">
                  <p>Your required documents are approved. You can publish a ride.</p>
                  <Link to="/driver-documents" className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-xs font-bold text-white hover:bg-green-800">
                    <FileLock2 className="h-4 w-4" />Manage documents<ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {documentsError && <div><p>{documentsError}</p><button type="button" onClick={() => void loadDriverDocuments()} className="mt-1 font-bold underline">Retry check</button></div>}
                  <p>{documentsError ? 'Upload your documents on the secure verification page. Publishing stays locked until approval is confirmed.' : 'Upload your driving licence and vehicle RC. Ride publishing stays locked until both are approved.'}</p>
                  <Link to="/driver-documents" className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-xs font-bold text-white hover:bg-green-800">
                    <FileLock2 className="h-4 w-4" />Upload documents<ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default OfferRidePage;
