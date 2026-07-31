import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchRidesWithBackend, bookSeatWithBackend, createPaymentOrder, verifyPaymentSignature } from '../api/auth';
import { useAppStore } from '../store/useAppStore';
import RideMap from '../components/RideMap';
import { Phone, MessageSquare, CarFront } from 'lucide-react';

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface DriverOffer {
  id: number;
  driver_id: number;
  driver_name?: string;     
  vehicle_number?: string; 
  driver_phone?: string;    
  origin: string;           
  destination: string;      
  price_per_seat: number;
  available_seats: number;
  gender_preference: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: any) => { open: () => void };
  }
}


export default function FindRide() {
  const navigate = useNavigate();
  const { currentLocation, setRoute, destinationLocation, setDestinationLocation, user } = useAppStore();
  
  // Passenger's location
  const startLat = currentLocation ? currentLocation[0] : 17.4400;
  const startLon = currentLocation ? currentLocation[1] : 78.3489;

  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchResults, setSearchResults] = useState<DriverOffer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // 🔍 1. AUTOCOMPLETE SEARCH LOGIC
  useEffect(() => {
    if (destination.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const bounds = "78.2,17.2,78.7,17.7"; 
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&viewbox=${bounds}&bounded=1&limit=5`);
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

  // 🚀 3. SEARCH THE DATABASE FOR MATCHING OFFERS
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationLocation) return alert("Please select a destination from the list.");
    
    setIsSearching(true);
    setHasSearched(true);
    
    const result = await searchRidesWithBackend(
      startLat, 
      startLon, 
      destinationLocation[0], 
      destinationLocation[1]
    );

    if (result.success) {
      setSearchResults(result.data);
    }
    setIsSearching(false);
  };

  // Action Handlers
  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Failed to load Razorpay script'));
      document.body.appendChild(script);
    });
  };

  const handleBookSeat = async (offer: DriverOffer) => {
    try {
      setIsPaying(true);
      await loadRazorpayScript();

      const orderResult = await createPaymentOrder(offer.price_per_seat, offer.id);
      if (!orderResult.success || !orderResult.data?.order_id) {
        throw new Error(orderResult.error || 'Unable to create payment order');
      }

      const { order_id, key_id, amount, currency } = orderResult.data;

      const options = {
        key: key_id,
        amount,
        currency,
        name: 'SyncroGo',
        description: `Ride seat for ${offer.origin.split(',')[0] || 'your trip'}`,
        order_id,
        handler: async (response: any) => {
          const verifyResult = await verifyPaymentSignature({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            ride_id: offer.id,
          });

          if (!verifyResult.success) {
            alert('Payment verification failed.');
            setIsPaying(false);
            return;
          }

          const bookingResult = await bookSeatWithBackend(offer.id);
          if (bookingResult.success) {
            alert('✅ Payment successful and seat booked!');
            await handleSearch({ preventDefault: () => undefined } as React.FormEvent);
          } else {
            alert(`❌ Booking failed: ${bookingResult.error}`);
          }
          setIsPaying(false);
        },
        prefill: {
          name: 'Passenger',
          email: 'passenger@example.com',
          contact: '9999999999',
        },
        theme: {
          color: '#2563eb',
        },
      };

      const rzp = new window.Razorpay!(options);
      rzp.open();
    } catch (error: any) {
      console.error('Payment flow failed:', error);
      alert(`❌ ${error.message || 'Payment failed'}`);
      setIsPaying(false);
    }
  };

  const handleCall = (phone?: string) => {
    if (phone) window.location.href = `tel:${phone}`;
    else alert("Phone number not provided by driver.");
  };

  // ✅ UPDATED: Passing the full offer to extract all necessary IDs
  const handleMessage = (offer: DriverOffer) => {
    const currentPassengerId = Number(user?.id);

    navigate('/message', {
      state: {
        chatPartnerName: offer.driver_name || `Driver`,
        driverPhone: offer.driver_phone,
        rideId: offer.id,                  // 👈 Passes the Ride ID
        receiverId: offer.driver_id,       // 👈 Passes the Driver's ID (They receive the message)
        currentUserId: currentPassengerId  // 👈 Passes the Passenger's ID (Who is looking at the screen)
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      <div className="bg-white px-6 py-6 rounded-b-3xl shadow-sm z-20 relative">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setDestinationLocation(null); setRoute(null); navigate(-1); }} 
            className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-syncro-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-2xl font-bold font-poppins text-syncro-dark">Find a Ride</h1>
        </div>
      </div>

      <div className="h-48 z-0 relative shadow-inner">
         <RideMap />
      </div>

      <div className="flex-grow p-6 overflow-y-auto z-10 -mt-4 pb-24">
        
        {/* PASSENGER SEARCH FORM */}
        <form onSubmit={handleSearch} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 mb-6">
          <div className="relative">
            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Where to?</p>
            <input 
              type="text" 
              required
              placeholder="e.g. HiTech City"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 outline-none focus:border-syncro-blue"
            />
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-48 overflow-y-auto z-50">
                {suggestions.map((place) => (
                  <button
                    key={place.place_id}
                    type="button"
                    onClick={() => handleSelectSuggestion(place)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 border-b border-gray-50"
                  >
                    <span className="text-xl mt-0.5">📍</span>
                    <span className="text-sm font-medium text-gray-700 line-clamp-2">{place.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button 
            type="submit"
            disabled={isSearching || !destinationLocation}
            className="w-full bg-syncro-blue text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg disabled:bg-gray-400"
          >
            {isSearching ? 'Searching...' : 'Search Available Rides'}
          </button>
        </form>

        {/* SEARCH RESULTS FEED */}
        {hasSearched && !isSearching && (
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-gray-700 mb-2">
              {searchResults.length > 0 ? `Found ${searchResults.length} rides heading your way` : 'No rides found on this route.'}
            </h2>
            
            {searchResults.map((offer) => (
              <div key={offer.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
                
                {/* Driver Info & Pricing */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{offer.driver_name || `Driver ${offer.driver_id}`}</h3>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-md mt-1">
                      <CarFront size={14} />
                      {offer.vehicle_number || "Vehicle TBA"}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-syncro-green">₹{offer.price_per_seat}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase mt-1">{offer.available_seats} Seats Left</p>
                  </div>
                </div>
                
              {/* Route Context */}
              <div>
                <p className="text-sm font-semibold text-gray-700 line-clamp-1 border-l-2 border-indigo-500 pl-2 ml-1">
                  {offer?.origin?.split(',')[0] || "Origin"}
                </p>
                <p className="text-sm font-semibold text-gray-500 line-clamp-1 border-l-2 border-gray-300 pl-2 ml-1 mt-2">
                  {offer?.destination?.split(',')[0] || "Destination"}
                </p>
              </div>
                
                {/* Preference Tag */}
                <div className="flex">
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold capitalize">
                    {offer?.gender_preference?.replace('_', ' ') || "Any Gender"}
                  </span>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-2">
                 <button 
                  // ✅ UPDATED: Pass the entire offer object into the function
                  onClick={() => handleMessage(offer)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl flex justify-center items-center transition-colors"
                >
                  <MessageSquare size={18} />
                </button>
                  
                  <button 
                    onClick={() => handleCall(offer.driver_phone)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl flex justify-center items-center transition-colors"
                  >
                    <Phone size={18} />
                  </button>
                  
                  <button 
                    onClick={() => handleBookSeat(offer)}
                    disabled={isPaying}
                    className="flex-[2] bg-syncro-dark text-white font-bold py-3 rounded-xl hover:bg-black transition-colors disabled:bg-gray-400"
                  >
                    {isPaying ? 'Processing...' : 'Book Seat & Pay'}
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
