import { useEffect, useState } from 'react';
import RideMap from './RideMap';
import { useAppStore } from '../store/useAppStore';

type LocationValue = {
  address: string;
  lat: number | null;
  lng: number | null;
};

type LocationPayload = {
  pickup: LocationValue;
  destination: LocationValue;
};

type PlaceOption = {
  title?: string;
  address: string;
  lat: number;
  lng: number;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

interface LocationFlowProps {
  onRouteConfirmed: (payload: LocationPayload) => void;
}

const savedPlaces: PlaceOption[] = [
  { title: 'Home', address: 'Jubilee Hills', lat: 17.43561, lng: 78.40785 },
  { title: 'Office', address: 'HITEC City', lat: 17.4483, lng: 78.3915 },
];

const recentPlaces: PlaceOption[] = [
  { address: 'Gachibowli', lat: 17.44233, lng: 78.37621 },
  { address: 'Secunderabad', lat: 17.4344, lng: 78.5022 },
  { address: 'Shamshabad', lat: 17.2403, lng: 78.4294 },
];

export default function LocationFlow({ onRouteConfirmed }: LocationFlowProps) {
  const { setPickupLocation, setDestinationLocation } = useAppStore();
  const [step, setStep] = useState<'main' | 'search_pickup' | 'search_dest' | 'map_pinpoint'>('main');
  const [activeSearchType, setActiveSearchType] = useState<'pickup' | 'destination' | null>(null);
  const [pickup, setPickup] = useState<LocationValue>({ address: '', lat: null, lng: null });
  const [destination, setDestination] = useState<LocationValue>({ address: '', lat: null, lng: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingGps, setLoadingGps] = useState(false);

  useEffect(() => {
    if (!activeSearchType || (step !== 'search_pickup' && step !== 'search_dest')) {
      return;
    }

    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length < 3) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const delay = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(trimmedQuery)}&addressdetails=1&limit=6`,
          {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'SyncroGo/1.0 (contact@example.com)',
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Search error: ${response.status}`);
        }

        const result = (await response.json()) as NominatimResult[];
        setSearchResults(result);
      } catch (error) {
        if ((error as any).name !== 'AbortError') {
          setSearchError('Unable to load locations. Please try again.');
          setSearchResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(delay);
      controller.abort();
    };
  }, [searchQuery, activeSearchType, step]);

  const handleCurrentLocation = (target: 'pickup' | 'destination' = 'pickup') => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let resolvedAddress = `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
              resolvedAddress = data.display_name;
            }
          }
        } catch {}

        const currentLocData = { address: resolvedAddress, lat, lng };

        if (target === 'pickup' || activeSearchType === 'pickup' || step === 'main') {
          setPickup(currentLocData);
          setPickupLocation([lat, lng], resolvedAddress);
        } else {
          setDestination(currentLocData);
          setDestinationLocation([lat, lng], resolvedAddress);
        }
        setLoadingGps(false);
        setStep('main');
      },
      () => {
        alert('Unable to retrieve your location. Please allow location access.');
        setLoadingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    // If pickup not yet initialized, attempt to prefetch current location
    if (pickup.lat === null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          let addr = `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.display_name) addr = data.display_name;
            }
          } catch {}
          setPickup({ address: addr, lat, lng });
          setPickupLocation([lat, lng], addr);
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  const handleSelectPlace = (place: PlaceOption | NominatimResult) => {
  const selected = {
    address:
      "display_name" in place
        ? place.display_name
        : place.title
        ? place.title
        : place.address,

    lat: Number(place.lat),

    lng: Number("lon" in place ? place.lon : place.lng),
  };
    if (activeSearchType === 'pickup') {
      setPickup(selected);
      setPickupLocation([selected.lat, selected.lng], selected.address);
    } else {
      setDestination(selected);
      setDestinationLocation([selected.lat, selected.lng], selected.address);
    }

    setStep('main');
    setSearchQuery(selected.address);
    setSearchResults([]);
  };

  const [pinnedAddress, setPinnedAddress] = useState('Road No 36, Jubilee Hills, Hyderabad');
  const [pinnedCoords, setPinnedCoords] = useState<[number, number]>([17.436, 78.408]);
  const [geocoding, setGeocoding] = useState(false);

  const fetchPinAddress = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      if (response.ok) {
        const data = await response.json();
        const display = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setPinnedAddress(display);
      } else {
        setPinnedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setPinnedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setGeocoding(false);
    }
  };

  const handleConfirmPinpoint = () => {
    const pinnedLocation = {
      address: pinnedAddress || `${pinnedCoords[0].toFixed(5)}, ${pinnedCoords[1].toFixed(5)}`,
      lat: pinnedCoords[0],
      lng: pinnedCoords[1],
    };

    if (activeSearchType === 'pickup') {
      setPickup(pinnedLocation);
      setPickupLocation([pinnedLocation.lat, pinnedLocation.lng], pinnedLocation.address);
    } else {
      setDestination(pinnedLocation);
      setDestinationLocation([pinnedLocation.lat, pinnedLocation.lng], pinnedLocation.address);
    }

    setStep('main');
  };

  const handleFinalConfirm = () => {
    if (!pickup.lat || !destination.lat) {
      alert('Please select both pickup and destination locations.');
      return;
    }

    onRouteConfirmed({ pickup, destination });
  };


  if (step === 'search_pickup' || step === 'search_dest') {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen p-6 font-sans">
        <div className="flex items-center mb-6">
          <button
            onClick={() => setStep('main')}
            className="text-gray-600 font-bold mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            ← Back
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            Select {activeSearchType === 'pickup' ? 'Pickup' : 'Destination'}
          </h2>
        </div>

        <div className="relative mb-6">
          <input
            type="text"
            placeholder={`Search ${activeSearchType === 'pickup' ? 'pickup' : 'destination'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
          />
          {isSearching && (
            <div className="absolute right-3 top-3 text-xs text-slate-500">Searching…</div>
          )}
        </div>

        {searchError && <p className="mb-4 text-sm text-rose-600">{searchError}</p>}
        {(searchResults.length > 0 || (searchQuery.trim().length >= 3 && !isSearching)) && (
          <div className="space-y-2 mb-4">
            {searchResults.map((place) => (
              <button
                key={place.place_id}
                onClick={() => handleSelectPlace(place)}
                className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-left text-sm hover:bg-gray-50"
              >
                <div className="font-medium text-slate-900">{place.display_name}</div>
              </button>
            ))}
            {searchResults.length === 0 && !isSearching && searchQuery.trim().length >= 3 && (
              <div className="rounded-2xl bg-gray-50 p-3 text-sm text-slate-500">No locations found.</div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={() => handleCurrentLocation(activeSearchType || 'pickup')}
            className="w-full flex items-center space-x-3 text-left p-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 transition text-blue-700 font-bold border border-blue-200 shadow-sm"
          >
            <span className="text-xl">🎯</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-800">
                {loadingGps ? 'Detecting current GPS location...' : 'Use Current Location'}
              </p>
              <p className="text-xs text-blue-600 font-normal">
                Set exact live GPS coordinates & reverse-geocoded address
              </p>
            </div>
          </button>

          <button
            onClick={() => setStep('map_pinpoint')}
            className="w-full flex items-center space-x-3 text-left p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-700 font-semibold"
          >
            <span>🗺️</span>
            <span>Select on Map (Pinpoint)</span>
          </button>
        </div>

        <div className="mt-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Saved Places</p>
          <div className="space-y-2">
            {savedPlaces.map((place, idx) => (
              <div
                key={`saved-${idx}`}
                onClick={() => handleSelectPlace(place)}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition border border-transparent hover:border-gray-200"
              >
                <span className="text-lg">⭐</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{place.title}</p>
                  <p className="text-xs text-gray-500">{place.address}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Destinations</p>
          <div className="space-y-2">
            {recentPlaces.map((place, idx) => (
              <div
                key={`recent-${idx}`}
                onClick={() => handleSelectPlace(place)}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition border border-transparent hover:border-gray-200"
              >
                <span className="text-lg">🕒</span>
                <p className="text-sm font-medium text-gray-700">{place.address}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'map_pinpoint') {
    return (
      <div className="max-w-md mx-auto bg-gray-900 min-h-screen flex flex-col justify-between font-sans relative">
        <div className="absolute inset-0 [&>div]:h-full [&>div]:rounded-none [&>div]:border-0">
          <RideMap />
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="absolute text-center z-20">
            <span className="text-4xl animate-bounce">📍</span>
            <p className="text-xs text-white bg-black/75 px-3 py-1.5 rounded-full mt-2 font-medium shadow-lg">
              Adjust map pin point
            </p>
          </div>
        </div>

        <div className="p-4 z-10 flex justify-between items-center">
          <button
            onClick={() => setStep(activeSearchType === 'destination' ? 'search_dest' : 'search_pickup')}
            className="bg-white text-gray-800 font-bold px-4 py-2 rounded-xl shadow-lg hover:bg-gray-100"
          >
            ← Back
          </button>
          <button
            onClick={() => {
              const lat = 17.436 + (Math.random() - 0.5) * 0.01;
              const lng = 78.408 + (Math.random() - 0.5) * 0.01;
              setPinnedCoords([lat, lng]);
              void fetchPinAddress(lat, lng);
            }}
            className="bg-blue-600 text-white font-bold px-3 py-2 rounded-xl shadow-lg text-xs"
          >
            🎯 Adjust Pin
          </button>
        </div>

        <div className="bg-white p-6 rounded-t-3xl z-10 shadow-2xl space-y-4">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Selected {activeSearchType === 'pickup' ? 'Pickup' : 'Destination'} Pinpoint
            </p>
            <p className="text-sm font-bold text-gray-900 mt-1 line-clamp-2">
              {geocoding ? "Finding address..." : pinnedAddress}
            </p>
            <p className="text-xs text-gray-400 font-mono mt-1">
              {pinnedCoords[0].toFixed(5)}, {pinnedCoords[1].toFixed(5)}
            </p>
          </div>
          <button
            onClick={handleConfirmPinpoint}
            disabled={geocoding}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl shadow-lg transition disabled:opacity-60"
          >
            Confirm Pin Location
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-gray-100 bg-white p-5 font-sans shadow-xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Ride Search</p>
        <h2 className="mt-1 text-xl font-extrabold text-gray-900">Where are you going?</h2>
      </div>

      <div
        onClick={() => {
          setActiveSearchType('pickup');
          setStep('search_pickup');
        }}
        className="flex items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 shadow-sm transition hover:border-indigo-500 cursor-pointer"
      >
        <span className="mr-3 h-3.5 w-3.5 flex-shrink-0 rounded-full bg-blue-600"></span>
        <div className="flex-1 overflow-hidden">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">From (Pickup)</p>
          <p className="truncate text-sm font-bold text-gray-800">
            {pickup.address || 'Select pickup location'}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCurrentLocation('pickup');
          }}
          className="ml-2 flex items-center gap-1.5 rounded-xl bg-blue-100/80 hover:bg-blue-200 text-blue-800 px-3 py-1.5 text-xs font-bold transition border border-blue-200 shrink-0"
        >
          <span>🎯</span>
          <span>{loadingGps ? 'GPS...' : 'Current Location'}</span>
        </button>
      </div>

      <div
        onClick={() => {
          setActiveSearchType('destination');
          setStep('search_dest');
        }}
        className="flex items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 shadow-sm transition hover:border-emerald-500 cursor-pointer"
      >
        <span className="mr-3 h-3.5 w-3.5 flex-shrink-0 rounded-full bg-emerald-600"></span>
        <div className="flex-1 overflow-hidden">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">To (Destination)</p>
          <p className="truncate text-sm font-bold text-gray-800">
            {destination.address || 'Search destination'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recent</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {['Home', 'Office', 'Gachibowli'].map((item) => (
            <span key={item} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm">
              {item}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={handleFinalConfirm}
        className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg transition duration-200 hover:bg-emerald-700"
      >
        Search Ride
      </button>
    </div>
  );
}
