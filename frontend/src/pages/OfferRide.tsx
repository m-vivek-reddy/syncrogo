import { useState, useEffect } from 'react';
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
  const { currentLocation, setRoute, destinationLocation, setDestinationLocation } = useAppStore();
  
  // Fallback GPS if currentLocation isn't loaded yet
  const startLat = currentLocation ? currentLocation[0] : 17.4400;
  const startLon = currentLocation ? currentLocation[1] : 78.3489;

  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [price, setPrice] = useState<number>(150);
  const [seats, setSeats] = useState<number>(2);
  const [genderPref, setGenderPref] = useState<string>('any');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔍 1. AUTOCOMPLETE SEARCH LOGIC
  useEffect(() => {
    if (destination.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const bounds = "78.2,17.2,78.7,17.7"; // Bounding box for Hyderabad
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&viewbox=${bounds}&bounded=1&limit=5`
        );
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      }
    }, 400); 

    return () => clearTimeout(delayDebounce);
  }, [destination]);

  // 📍 2. HANDLE SELECTION & DRAW ROUTE
  const handleSelectSuggestion = async (place: Suggestion) => {
    setDestination(place.display_name);
    setSuggestions([]);
    
    const destLat = parseFloat(place.lat);
    const destLon = parseFloat(place.lon);
    setDestinationLocation([destLat, destLon]);

    // Draw the route line on the map
    try {
      const start = `${startLon},${startLat}`;
      const end = `${destLon},${destLat}`;
      const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`);
      const routeData = await routeRes.json();

      if (routeData.routes && routeData.routes.length > 0) {
        const route = routeData.routes[0];
        const coordinates = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        setRoute(coordinates);
      }
    } catch (error) {
      console.error("Routing failed:", error);
    }
  };

  // 🚀 3. PUBLISH TO DATABASE WITH REAL COORDS
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationLocation) return alert("Please select a destination from the dropdown list.");
    
    setIsSubmitting(true);
    
    const result = await publishOfferWithBackend({
      pickup_location: "Current GPS Location", 
      pickup_lat: startLat,
      pickup_lon: startLon,
      dropoff_location: destination,
      dropoff_lat: destinationLocation[0], 
      dropoff_lon: destinationLocation[1],
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
          
          {/* Route Section */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-700 mb-4">Your Route</h2>
            <div className="flex flex-col gap-4 relative">
              <div className="absolute left-2.5 top-5 bottom-5 w-0.5 bg-gray-200"></div>
              
              <div className="flex items-center gap-4 z-10">
                <div className="w-5 h-5 rounded-full bg-syncro-dark flex-shrink-0 border-4 border-white shadow-sm"></div>
                <div className="flex-grow">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Starting point</p>
                  <p className="font-medium">Current GPS Location</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 z-10 relative">
                <div className="w-5 h-5 rounded-full bg-syncro-green flex-shrink-0 border-4 border-white shadow-sm"></div>
                <div className="flex-grow">
                   <p className="text-xs text-gray-400 font-bold uppercase mb-1">Heading to</p>
                   <input 
                      type="text" 
                      required
                      placeholder="e.g. HiTech City"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-syncro-green"
                   />
                   
                   {/* 🔍 SEARCH DROPDOWN */}
                   {suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-48 overflow-y-auto z-50 divide-y divide-gray-50">
                        {suggestions.map((place) => (
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
          </div>

          {/* Details Section */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-5">
            <h2 className="font-bold text-gray-700">Ride Details</h2>
            
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
            disabled={isSubmitting || !destinationLocation}
            className="w-full bg-syncro-dark text-white font-bold py-4 rounded-xl hover:bg-black transition-colors shadow-lg mt-2 disabled:bg-gray-400"
          >
            {isSubmitting ? 'Publishing...' : 'Publish Ride Offer'}
          </button>
        </form>
      </div>
    </div>
  );
}