import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { publishOfferWithBackend } from '../api/auth';
import { useAppStore } from '../store/useAppStore';
import RideMap from '../components/RideMap'; // 🗺️ IMPORT THE MAP

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function OfferRide() {
  const navigate = useNavigate();
  
  // 🧠 Pull map state from your global store
  const { currentLocation, pickupLabel, pickupLocation, setPickupLocation, setRoute, destinationLocation, setDestinationLocation } = useAppStore();
  
  const startLat = pickupLocation ? pickupLocation[0] : currentLocation ? currentLocation[0] : 17.4400;
  const startLon = pickupLocation ? pickupLocation[1] : currentLocation ? currentLocation[1] : 78.3489;

  const [pickup, setPickup] = useState<string>('');
  const [destination, setDestination] = useState('');
  const [activeSearchType, setActiveSearchType] = useState<'pickup' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingGps, setLoadingGps] = useState(false);
  const [departureTime, setDepartureTime] = useState('');
  const [price, setPrice] = useState<number>(150);
  const [seats, setSeats] = useState<number>(2);
  const [genderPref, setGenderPref] = useState<string>('any');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCurrentLocationName = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'SyncroGo/1.0 (contact@example.com)',
          },
        }
      );
      const data = await response.json();
      const address = data.address || {};
      const locationName = [
        address.road,
        address.suburb,
        address.city || address.town || address.village,
      ]
        .filter(Boolean)
        .join(', ');

      return locationName || data.display_name || 'Current GPS Location';
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return 'Current GPS Location';
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const address = await getCurrentLocationName(lat, lon);
        const selectedAddress = address || 'Current GPS Location';

        if (activeSearchType === 'destination') {
          setDestination(selectedAddress);
          setDestinationLocation([lat, lon], selectedAddress);
        } else {
          setPickup(selectedAddress);
          setPickupLocation([lat, lon], selectedAddress);
        }

        setLoadingGps(false);
        setSearchResults([]);
        setActiveSearchType(null);
        setSearchQuery('');
      },
      () => {
        alert('Unable to retrieve your location. Please allow location access.');
        setLoadingGps(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSelectSuggestion = (place: Suggestion) => {
    const selectedAddress = place.display_name;
    const coords: [number, number] = [parseFloat(place.lat), parseFloat(place.lon)];

    if (activeSearchType === 'destination') {
      setDestination(selectedAddress);
      setDestinationLocation(coords, selectedAddress);
    } else {
      setPickup(selectedAddress);
      setPickupLocation(coords, selectedAddress);
    }

    setSearchResults([]);
    setSearchQuery('');
    setActiveSearchType(null);
  };

  useEffect(() => {
    if (!activeSearchType) {
      setSearchResults([]);
      return;
    }

    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length < 3) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const delayDebounce = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(trimmedQuery)}&addressdetails=1&limit=6`,
          {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'SyncroGo/1.0 (contact@example.com)',
            },
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          throw new Error(`Search failed: ${res.status}`);
        }

        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        if ((err as any).name !== 'AbortError') {
          console.error('Error fetching suggestions:', err);
          setSearchError('Unable to load locations. Please try again.');
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [searchQuery, activeSearchType]);

  useEffect(() => {
    if (!pickupLocation || !destinationLocation) return;

    const fetchRoute = async () => {
      try {
        const start = `${pickupLocation[1]},${pickupLocation[0]}`;
        const end = `${destinationLocation[1]},${destinationLocation[0]}`;
        const routeRes = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`
        );
        const routeData = await routeRes.json();

        if (routeData.routes && routeData.routes.length > 0) {
          const route = routeData.routes[0];
          const coordinates = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          setRoute(coordinates);
        }
      } catch (error) {
        console.error('Routing failed:', error);
      }
    };

    void fetchRoute();
  }, [pickupLocation, destinationLocation, setRoute]);

  // 🚀 3. PUBLISH TO DATABASE WITH REAL COORDS
  const handlePublish = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!destinationLocation) return alert("Please select a destination from the dropdown list.");
    
    setIsSubmitting(true);
    
    const result = await publishOfferWithBackend({
      pickup_location: pickup || pickupLabel || 'Current GPS Location', 
      pickup_lat: startLat,
      pickup_lon: startLon,
      dropoff_location: destination,
      dropoff_lat: destinationLocation[0], 
      dropoff_lon: destinationLocation[1],
      departure_time: departureTime || null,
      price_per_seat: price,
      available_seats: seats,
      gender_preference: genderPref
    });

    setIsSubmitting(false);

    if (result.success) {
      alert("🎉 Ride offer published successfully!");
      // Reset map state before leaving
      setDestinationLocation(null);
      setRoute(null);
      navigate('/home');
    } else {
      alert(`Failed to publish: ${result.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      
      {/* HEADER */}
      <div className="bg-white px-6 py-6 rounded-b-3xl shadow-sm z-20 relative">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setDestinationLocation(null);
              setRoute(null);
              navigate(-1);
            }} 
            className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-syncro-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-2xl font-bold font-poppins text-syncro-dark">Offer a Ride</h1>
        </div>
      </div>

      {/* 🗺️ THE LIVE MAP */}
      <div className="h-48 z-0 relative shadow-inner">
         <RideMap />
      </div>

      {/* SCROLLABLE FORM */}
      <div className="flex-grow p-6 overflow-y-auto z-10 -mt-4">
        <form onSubmit={handlePublish} className="flex flex-col gap-6 relative">
          
          {/* Route Selection */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-700 mb-4">Your Route</h2>
            <div className="flex flex-col gap-4 relative">
              <div className="absolute left-2.5 top-5 bottom-5 w-0.5 bg-gray-200"></div>

              <div className="flex items-center gap-4 z-10">
                <div className="w-5 h-5 rounded-full bg-syncro-dark flex-shrink-0 border-4 border-white shadow-sm"></div>
                <div className="flex-grow">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">From</p>
                  <div className="relative">
                    <input
                      type="text"
                      value={pickup}
                      onFocus={() => {
                        setActiveSearchType('pickup');
                        setSearchQuery(pickup);
                      }}
                      onChange={(e) => {
                        setPickup(e.target.value);
                        setActiveSearchType('pickup');
                        setSearchQuery(e.target.value);
                      }}
                      placeholder="Search pickup or use GPS"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-syncro-green"
                    />
                    {activeSearchType === 'pickup' && searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-48 overflow-y-auto z-50 divide-y divide-gray-50">
                        {searchResults.map((place) => (
                          <button
                            key={place.place_id}
                            type="button"
                            onClick={() => handleSelectSuggestion(place)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3"
                          >
                            <span className="text-xl mt-0.5">📍</span>
                            <span className="text-sm font-medium text-gray-700 line-clamp-2">{place.display_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 z-10 relative">
                <div className="w-5 h-5 rounded-full bg-syncro-green flex-shrink-0 border-4 border-white shadow-sm"></div>
                <div className="flex-grow">
                   <p className="text-xs text-gray-400 font-bold uppercase mb-1">To</p>
                   <div className="relative">
                     <input 
                        type="text" 
                        required
                        value={destination}
                        onFocus={() => {
                          setActiveSearchType('destination');
                          setSearchQuery(destination);
                        }}
                        onChange={(e) => {
                          setDestination(e.target.value);
                          setActiveSearchType('destination');
                          setSearchQuery(e.target.value);
                        }}
                        placeholder="Search destination"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-syncro-green"
                     />
                     {activeSearchType === 'destination' && searchResults.length > 0 && (
                       <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-48 overflow-y-auto z-50 divide-y divide-gray-50">
                         {searchResults.map((place) => (
                           <button
                             key={place.place_id}
                             type="button"
                             onClick={() => handleSelectSuggestion(place)}
                             className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3"
                           >
                             <span className="text-xl mt-0.5">📍</span>
                             <span className="text-sm font-medium text-gray-700 line-clamp-2">{place.display_name}</span>
                           </button>
                         ))}
                       </div>
                     )}
                   </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 z-10">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="w-full rounded-xl bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  {loadingGps ? 'Locating current location…' : 'Use current GPS location'}
                </button>
                {searchError && <p className="text-sm text-rose-600">{searchError}</p>}
                {activeSearchType && searchQuery.trim().length >= 3 && !isSearching && searchResults.length === 0 && (
                  <p className="text-sm text-slate-500">No locations found. Try a different query.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Schedule</p>
                <input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-syncro-green"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="font-medium text-gray-600">Price per seat (₹)</label>
              <input 
                type="number" 
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center outline-none focus:border-syncro-green font-bold text-syncro-green"
              />
            </div>

            <div className="flex justify-between items-center">
              <label className="font-medium text-gray-600">Available Seats</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setSeats(Math.max(1, seats - 1))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold">-</button>
                <span className="font-bold w-4 text-center">{seats}</span>
                <button type="button" onClick={() => setSeats(Math.min(4, seats + 1))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold">+</button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-600">Safety Preference</label>
              <select 
                value={genderPref}
                onChange={(e) => setGenderPref(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 outline-none focus:border-syncro-green"
              >
                <option value="any">Any Gender</option>
                <option value="female_only">Female Only</option>
                <option value="male_only">Male Only</option>
              </select>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting || !destinationLocation || !pickupLocation}
            className="w-full bg-syncro-dark text-white font-bold py-4 rounded-xl hover:bg-black transition-colors shadow-lg mt-2 disabled:bg-gray-400"
          >
            {isSubmitting ? 'Publishing...' : 'Publish Ride Offer'}
          </button>
        </form>
      </div>
    </div>
  );
}