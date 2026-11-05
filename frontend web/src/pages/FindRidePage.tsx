import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Car, Bike, Calendar, Clock, LocateFixed, MapPin,
  ShieldCheck, Star, Users, ArrowRight, CheckCircle2, AlertCircle
} from 'lucide-react';
import { searchRidesApi, bookRideApi } from '../api/rides';
import type { Ride, VehicleType } from '../types';
import { InteractiveRouteMap } from '../components/common/InteractiveRouteMap';
import { LocationAutocomplete } from '../components/common/LocationAutocomplete';

export const FindRidePage: React.FC = () => {
  const [fromLocation, setFromLocation] = useState('Kondapur, Hyderabad');
  const [toLocation, setToLocation] = useState('HITEC City, Hyderabad');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [pickupCoord, setPickupCoord] = useState({ lat: 17.4699, lon: 78.3578 });
  const [dropoffCoord, setDropoffCoord] = useState({ lat: 17.4435, lon: 78.3772 });
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'dropoff'>('pickup');
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [rides, setRides] = useState<Ride[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const mapPickup = useMemo(() => ({ ...pickupCoord, label: fromLocation }), [pickupCoord, fromLocation]);
  const mapDropoff = useMemo(() => ({ ...dropoffCoord, label: toLocation }), [dropoffCoord, toLocation]);

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationMessage('Location not available in this browser.'); return; }
    setLocating(true); setLocationMessage(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setPickupCoord({ lat: coords.latitude, lon: coords.longitude }); setFromLocation('Current location'); setLocationMessage('Using your current location.'); setLocating(false); },
      () => { setLocationMessage('Allow location access to use your current position.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  useEffect(() => { requestLocation(); }, []);

  const selectMapPoint = async ({ lat, lon }: { lat: number; lon: number }) => {
    const point = { lat, lon };
    if (selectionMode === 'pickup') setPickupCoord(point);
    else setDropoffCoord(point);
    setRouteDistance(null);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
      const result = await response.json();
      const label = result.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      if (selectionMode === 'pickup') setFromLocation(label);
      else setToLocation(label);
    } catch {
      const label = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      if (selectionMode === 'pickup') setFromLocation(label);
      else setToLocation(label);
    }
  };

  const geocodeInput = async (side: 'pickup' | 'dropoff') => {
    const query = side === 'pickup' ? fromLocation : toLocation;
    if (!query.trim()) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`);
      const [result] = await response.json();
      if (!result) return;
      const point = { lat: Number(result.lat), lon: Number(result.lon) };
      if (side === 'pickup') setPickupCoord(point);
      else setDropoffCoord(point);
      setRouteDistance(null);
    } catch {
      setLocationMessage('Could not locate that address. Set the point by tapping the map.');
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true); setBookingSuccess(null); setBookingError(null);
    const res = await searchRidesApi({ pickup_lat: pickupCoord.lat, pickup_lon: pickupCoord.lon, dropoff_lat: dropoffCoord.lat, dropoff_lon: dropoffCoord.lon });
    setLoading(false); setHasSearched(true);
    if (res.success && res.data) { setRides(res.data); if (res.data.length > 0) setSelectedRide(res.data[0]); }
    else setRides([]);
  };

  const handleBook = async (ride: Ride) => {
    setBookingSuccess(null); setBookingError(null);
    const res = await bookRideApi(ride.id, 1);
    if (res.success) setBookingSuccess(`Booking confirmed with ${ride.driver_name}! Coordinate via message.`);
    else setBookingError(res.message || 'Failed to book ride. Please ensure you are logged in.');
  };

  const inputCls = 'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all';

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-green-600">Smart Corridor Transit</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-800 font-display tracking-tight mt-1">Find a Ride</h1>
          <p className="mt-1 text-slate-500 text-sm sm:text-base">Discover verified co-commuters traveling along your route. Share costs and travel safely.</p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_0.95fr]">
        {/* Search form */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-end">

            <div className="relative sm:col-span-2">
              <label className="mb-1.5 flex items-center justify-between gap-1 text-xs font-bold uppercase tracking-wider text-slate-600">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-green-600" />Pickup (From)</span>
                <button type="button" onClick={requestLocation} disabled={locating}
                  className="flex items-center gap-1 normal-case tracking-normal text-[10px] font-bold text-green-700 hover:text-green-800">
                  <LocateFixed className={`h-3.5 w-3.5 ${locating ? 'animate-pulse' : ''}`} />
                  {locating ? 'Locating...' : 'Use my location'}
                </button>
              </label>
              <LocationAutocomplete
                value={fromLocation}
                onChange={setFromLocation}
                onFocus={() => setSelectionMode('pickup')}
                onSelect={(location) => { setFromLocation(location.label); setPickupCoord({ lat: location.lat, lon: location.lon }); setRouteDistance(null); }}
                near={pickupCoord}
                onBlurFallback={() => void geocodeInput('pickup')}
                placeholder="e.g. Kondapur / Miyapur / KPHB"
                className="!mt-0 !bg-white !px-4 !py-2.5"
              />
              {locationMessage && <p className="absolute left-0 -bottom-4 text-[10px] font-medium text-slate-400 whitespace-nowrap">{locationMessage}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-400" />Destination (To)
              </label>
              <LocationAutocomplete
                value={toLocation}
                onChange={setToLocation}
                onFocus={() => setSelectionMode('dropoff')}
                onSelect={(location) => { setToLocation(location.label); setDropoffCoord({ lat: location.lat, lon: location.lon }); setRouteDistance(null); }}
                near={pickupCoord}
                onBlurFallback={() => void geocodeInput('dropoff')}
                placeholder="e.g. HITEC City / Gachibowli DLF"
                className="!mt-0 !bg-white !px-4 !py-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />Date
              </label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Vehicle</label>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {(['car', 'bike'] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setVehicleType(v)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      vehicleType === v ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500'
                    }`}>
                    {v === 'car' ? <Car className="w-3.5 h-3.5" /> : <Bike className="w-3.5 h-3.5" />}
                    {v === 'car' ? 'Car' : 'Bike'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-1 sm:col-span-2">
              <button type="submit" disabled={loading}
                className="px-8 py-3 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-60 hover:shadow-lg"
                style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)', boxShadow: '0 4px 14px rgba(7,126,233,0.3)' }}>
                <Search className="w-4 h-4" />
                {loading ? 'Searching Rides...' : 'Search Rides'}
              </button>
            </div>
          </form>
        </div>
        <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
          <div className="flex gap-2">
            {(['pickup', 'dropoff'] as const).map((side) => (
              <button key={side} type="button" onClick={() => setSelectionMode(side)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold ${selectionMode === side ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-500'}`}>
                {side === 'pickup' ? '1. Select pickup point' : '2. Select destination'}
              </button>
            ))}
          </div>
          <InteractiveRouteMap
            centerLat={pickupCoord.lat}
            centerLon={pickupCoord.lon}
            pickup={mapPickup}
            dropoff={mapDropoff}
            rides={rides}
            selectedRide={selectedRide}
            onSelectRide={setSelectedRide}
            vehicleType={vehicleType}
            selectionLabel={`Tap map to set ${selectionMode === 'pickup' ? 'pickup' : 'destination'}`}
            onMapClick={(point) => void selectMapPoint(point)}
            onRouteDistance={setRouteDistance}
            onLocate={requestLocation}
            locating={locating}
            className="h-[260px] w-full rounded-2xl lg:h-[320px]"
          />
          {routeDistance !== null && <p className="px-1 text-xs font-semibold text-slate-500">Road route: {routeDistance.toFixed(2)} km</p>}
        </aside>
        </div>

        {/* Notifications */}
        {bookingSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />{bookingSuccess}
          </div>
        )}
        {bookingError && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />{bookingError}
          </div>
        )}

        {/* Results */}
        <div className="grid grid-cols-1 gap-8 items-start">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-navy-800">
                {hasSearched ? `Matching Rides (${rides.length})` : 'Search for Available Corridor Rides'}
              </h3>
              <span className="text-xs text-slate-400">Live API Results</span>
            </div>

            {loading && (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500">Connecting to SyncroGo matching engine...</p>
              </div>
            )}

            {!loading && hasSearched && rides.length === 0 && (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3"><Car className="w-6 h-6" /></div>
                <h4 className="text-base font-bold text-navy-800 mb-1">No rides currently scheduled on this exact route</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">No driver has published an offer for these coordinates yet.</p>
                <div className="flex justify-center gap-3">
                  <a href="/offer-ride" className="px-4 py-2 text-white rounded-xl text-xs font-bold" style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)' }}>Offer a Ride</a>
                  <a href="/community" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200">Post in Community</a>
                </div>
              </div>
            )}

            {!loading && !hasSearched && (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <p className="text-sm text-slate-500">Enter your pickup and destination above, then click <strong>Search Rides</strong>.</p>
              </div>
            )}

            {!loading && rides.map((ride) => {
              const sel = selectedRide?.id === ride.id;
              return (
                <div key={ride.id} onClick={() => setSelectedRide(ride)}
                  className={`p-6 rounded-2xl bg-white border cursor-pointer transition-all ${
                    sel ? 'border-green-500 ring-2 ring-green-500/15 shadow-md' : 'border-slate-200 hover:border-slate-300 shadow-card hover:shadow-hover'
                  }`}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-700 font-bold text-base">
                        {ride.driver_photo ? <img src={ride.driver_photo} alt={ride.driver_name} className="w-full h-full object-cover" /> : ride.driver_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-extrabold text-navy-800">{ride.driver_name}</h4>
                          {ride.driver_verified && <ShieldCheck className="w-4 h-4 text-green-600" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                            <Star className="w-3.5 h-3.5 fill-current" />{ride.driver_rating.toFixed(1)}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{ride.vehicle_type}</span>
                          {ride.vehicle_model && <span>({ride.vehicle_model})</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-navy-800 font-display">₹{ride.price_per_seat}</div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">per seat</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 py-3 border-y border-slate-100 text-xs">
                    <div className="flex items-center gap-2 text-slate-600"><MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" /><span className="font-semibold">{ride.pickup_location}</span></div>
                    <div className="flex items-center gap-2 text-slate-600"><MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" /><span className="font-semibold">{ride.dropoff_location}</span></div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{ride.departure_time || 'Leaving Soon'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-semibold text-green-700"><Users className="w-3.5 h-3.5" />{ride.available_seats} seats left</span>
                      {ride.distance_km && <><span>•</span><span>{ride.distance_km} km</span></>}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleBook(ride); }}
                      className="px-4 py-2 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
                      style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)', boxShadow: '0 4px 12px rgba(7,126,233,0.25)' }}>
                      Request Ride <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FindRidePage;
