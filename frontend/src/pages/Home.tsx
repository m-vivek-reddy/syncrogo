import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { cancelBookingWithBackend, fetchActiveDriverRide, fetchDriverBookings, fetchPassengerBookings, searchRidesWithBackend } from '../api/auth';
import LocationFlow from '../components/LocationFlow';
import type { DriverOffer } from './AvailableRides';
import HomeMap from '../components/Map/HomeMap';
import QuickActions from '../components/Home/QuickActions';
import NearbyDrivers from '../components/Home/NearbyDrivers';
import PopularRoutes from '../components/Home/PopularRoutes';
import { MessageSquare, Phone } from 'lucide-react';

interface Passenger {
  id: number;
  name: string;
  phone: string;
}

// 👇 Updated interface to match the new database columns & expect passengers
interface ActiveRide {
  id: number;
  origin: string;
  destination: string;
  price_per_seat: number;
  available_seats?: number;
  seats_available?: number;
  created_at: string;
  passengers?: Passenger[];
}

export default function Home() {
  const navigate = useNavigate();
  const { isDriverMode, setDriverMode } = useAppStore();
  
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [passengerBookings, setPassengerBookings] = useState<any[]>([]);
  const [driverBookings, setDriverBookings] = useState<any[]>([]);
  const [isFindSheetOpen, setIsFindSheetOpen] = useState(false);
  const [isSearchingRides, setIsSearchingRides] = useState(false);
  const [nearbyOffers, setNearbyOffers] = useState<DriverOffer[] | null>(null);
  const [searchedRoute, setSearchedRoute] = useState<{ pickup: string; destination: string } | null>(null);
  const prevSeatsRef = useRef<number | null>(null);

  useEffect(() => {
    if (isDriverMode) return;

    const loadPassengerBookings = async () => {
      const result = await fetchPassengerBookings();
      if (result.success) {
        setPassengerBookings(result.data || []);
      }
    };

    loadPassengerBookings();
  }, [isDriverMode]);

  useEffect(() => {
    if (!isDriverMode) return;

    const loadDriverBookings = async () => {
      const result = await fetchDriverBookings();
      if (result.success) {
        setDriverBookings(result.data || []);
      }
    };

    loadDriverBookings();
  }, [isDriverMode]);

  // Driver polling logic
  useEffect(() => {
    if (!isDriverMode) return; 

    const loadActiveRide = async () => {
      const result = await fetchActiveDriverRide();
      if (result.success && result.data) {
        const currentSeats = result.data.available_seats ?? result.data.seats_available ?? 0;
        if (prevSeatsRef.current !== null && currentSeats < prevSeatsRef.current) {
           alert("🎉 A passenger just booked a seat on your ride!");
        }
        prevSeatsRef.current = currentSeats;
        setActiveRide(result.data);
      } else {
        setActiveRide(null);
        prevSeatsRef.current = null;
      }
    };

    loadActiveRide();
    const interval = setInterval(loadActiveRide, 5000);
    return () => clearInterval(interval);
  }, [isDriverMode]);

  // ✅ DRIVER-SIDE CHAT LOGIC
  const { user } = useAppStore();
  const handleMessagePassenger = (passenger: Passenger, rideId: number) => {
    const currentDriverId = Number(user?.id);

    navigate('/message', {
      state: {
        chatPartnerName: passenger.name || 'Passenger',
        driverPhone: passenger.phone,
        rideId: rideId,
        receiverId: passenger.id,
        currentUserId: currentDriverId
      }
    });
  };

  const openFindSheet = () => {
    setNearbyOffers(null);
    setSearchedRoute(null);
    setIsFindSheetOpen(true);
  };

  const handleOfferRide = () => {
    setDriverMode(true);
    navigate('/home');
  };

  const handleRouteConfirmed = async (route: { pickup: { address: string; lat: number | null; lng: number | null }; destination: { address: string; lat: number | null; lng: number | null } }) => {
    if (route.pickup.lat === null || route.pickup.lng === null || route.destination.lat === null || route.destination.lng === null) return;
    setIsSearchingRides(true);
    setSearchedRoute({ pickup: route.pickup.address, destination: route.destination.address });
    const result = await searchRidesWithBackend(route.pickup.lat, route.pickup.lng, route.destination.lat, route.destination.lng);
    setNearbyOffers(result.success ? result.data as DriverOffer[] : []);
    setIsSearchingRides(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20">
      {/* MAP PLACEHOLDER */}
      <HomeMap />

      {/* 🔀 CONDITIONAL DASHBOARD CONTENT */}
      {isDriverMode === false ? (
        
        /* ==========================================
           🚙 PASSENGER DASHBOARD
           ========================================== */
        <div className="flex-grow p-6 z-10 -mt-4 bg-slate-50 rounded-t-3xl relative">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2.5 h-2.5 bg-syncro-blue rounded-full animate-pulse"></div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Ready to Ride</p>
          </div>

          <div className="mb-5 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Plan your ride</p>
                <h3 className="mt-1 text-lg font-extrabold text-slate-900">Find a ride near you</h3>
                <p className="mt-1 text-sm text-slate-500">Tap below to search your next trip in seconds.</p>
              </div>
              <button onClick={openFindSheet} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm">Find Offers</button>
            </div>
          </div>

          <div className="mb-8"><QuickActions onOfferRide={handleOfferRide} onTrips={() => navigate('/trips')} onPayments={() => navigate('/payments')} onMessages={() => navigate('/messages')} /></div>
          <div className="mb-8"><NearbyDrivers /></div>
          <div className="mb-8"><PopularRoutes onSelect={openFindSheet} /></div>

          <h2 className="font-bold text-gray-700 mb-3">Recent Activity</h2>
          {passengerBookings.length > 0 ? (
            <div className="flex flex-col gap-3">
              {passengerBookings.map((booking) => (
                <div key={booking.booking_id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase px-2 py-1 bg-green-100 text-green-700 rounded-md">
                      {booking.status}
                    </span>
                    <span className="font-bold text-syncro-green">₹{booking.price}</span>
                  </div>
                  
                  <div>
                    <p className="text-sm font-bold text-gray-800">From: {booking.pickup_location}</p>
                    <p className="text-sm font-bold text-gray-600 mt-1">To: {booking.dropoff_location}</p>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => navigate('/message', {
                        state: {
                          chatPartnerName: booking.driver_name || 'Driver',
                          driverPhone: booking.driver_phone,
                          rideId: booking.ride_id,
                          receiverId: booking.driver_id,
                        }
                      })}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl flex justify-center items-center transition-colors"
                      title="Chat with Driver"
                    >
                      <MessageSquare size={18} />
                    </button>
                    
                    <button
                      onClick={() => {
                        if (booking.driver_phone) window.location.href = `tel:${booking.driver_phone}`;
                        else alert('Phone number not available.');
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl flex justify-center items-center transition-colors"
                      title="Call Driver"
                    >
                      <Phone size={18} />
                    </button>

                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to cancel this booking?')) {
                          const res = await cancelBookingWithBackend(booking.booking_id);
                          if (res.success) {
                            alert('Booking cancelled successfully.');
                            setPassengerBookings(prev => prev.filter((item) => item.booking_id !== booking.booking_id));
                          } else {
                            alert('Failed to cancel booking.');
                          }
                        }
                      }}
                      className="flex-[2] bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-xl transition-colors text-sm"
                    >
                      Cancel Ride
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-400 font-medium">
              No recent rides. Time to explore!
            </div>
          )}
        </div>

      ) : (

        /* ==========================================
           🚕 DRIVER DASHBOARD
           ========================================== */
        <div className="flex-grow p-6 z-10 -mt-4 bg-slate-50 rounded-t-3xl relative">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2.5 h-2.5 bg-syncro-green rounded-full animate-pulse"></div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Online • Driver Mode</p>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="bg-white flex-1 p-4 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 font-bold mb-1">Today's Earnings</p>
              <p className="text-2xl font-bold text-syncro-green">₹0</p> 
            </div>
            <div className="bg-white flex-1 p-4 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 font-bold mb-1">Available Seats</p>
              <p className="text-2xl font-bold text-gray-700">
                {activeRide ? (activeRide.available_seats ?? activeRide.seats_available ?? '-') : '-'}
              </p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/offer-ride')}
            className="w-full bg-syncro-green text-white font-bold py-4 rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-200 mb-8"
          >
            + Offer New Ride
          </button>

          <h2 className="font-bold text-gray-700 mb-3">
            {activeRide ? "Active Ride" : "No Active Rides"}
          </h2>
          
          {activeRide ? (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative">
               <div className="flex flex-col gap-6 relative">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200"></div>
                
                <div className="flex items-start gap-4 z-10">
                  <div className="w-5 h-5 rounded-full bg-syncro-dark flex-shrink-0 border-4 border-white shadow-sm mt-0.5"></div>
                  <div className="flex-grow">
                    <p className="font-bold text-gray-800">{activeRide?.origin?.split(',')[0] || "Origin"}</p>
                  </div>
                  <p className="font-bold text-syncro-green">Now</p>
                </div>
                
                <div className="flex items-start gap-4 z-10">
                  <div className="w-5 h-5 rounded-full bg-syncro-green flex-shrink-0 border-4 border-white shadow-sm mt-0.5"></div>
                  <div className="flex-grow">
                     <p className="font-bold text-gray-800">{activeRide?.destination?.split(',')[0] || "Destination"}</p>
                  </div>
                </div>
              </div>

              {/* 👇 BOOKED PASSENGERS SECTION */}
              {activeRide.passengers && activeRide.passengers.length > 0 && (
                <div className="mt-6 border-t border-gray-100 pt-5">
                  <p className="text-xs text-gray-400 font-bold mb-3 uppercase tracking-wider">Booked Passengers</p>
                  <div className="flex flex-col gap-3">
                    {activeRide.passengers.map((passenger) => (
                      <div key={passenger.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-gray-100">
                        <div>
                          <p className="font-bold text-gray-800">{passenger.name}</p>
                          <p className="text-xs text-gray-500">Seat Confirmed</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleMessagePassenger(passenger, activeRide.id)}
                            className="w-10 h-10 bg-white shadow-sm border border-gray-100 text-syncro-dark rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
                          >
                            <MessageSquare size={16} />
                          </button>
                          <button 
                            onClick={() => { if (passenger.phone) window.location.href = `tel:${passenger.phone}` }}
                            className="w-10 h-10 bg-white shadow-sm border border-gray-100 text-syncro-green rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
                          >
                            <Phone size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* 👆 END BOOKED PASSENGERS */}

              <div className="mt-6 flex flex-col gap-4">
                <h2 className="font-bold text-gray-700 text-lg">Booked Passengers ({driverBookings.length})</h2>
                
                {driverBookings.length > 0 ? (
                  driverBookings.map((booking) => (
                    <div key={booking.booking_id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{booking.passenger_name}</h3>
                          <span className="text-xs font-bold uppercase px-2 py-0.5 bg-green-100 text-green-700 rounded-md mt-1 inline-block">
                            {booking.status}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-syncro-green">₹{booking.price}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-800 border-l-2 border-indigo-500 pl-2 ml-1">
                          Pickup: {booking.pickup_location}
                        </p>
                        <p className="text-sm font-semibold text-gray-600 border-l-2 border-gray-300 pl-2 ml-1 mt-2">
                          Dropoff: {booking.dropoff_location}
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => navigate('/message', {
                            state: {
                              chatPartnerName: booking.passenger_name,
                              driverPhone: booking.passenger_phone,
                              rideId: booking.ride_id,
                              receiverId: booking.passenger_id,
                            }
                          })}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl flex justify-center items-center transition-colors text-sm font-medium gap-2"
                        >
                          <MessageSquare size={16} /> Chat
                        </button>
                        
                        <button
                          onClick={() => {
                            if (booking.passenger_phone) window.location.href = `tel:${booking.passenger_phone}`;
                            else alert('Passenger phone number not available.');
                          }}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl flex justify-center items-center transition-colors text-sm font-medium gap-2"
                        >
                          <Phone size={16} /> Call
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-400 font-medium">
                    No passengers have booked your active ride yet.
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-400 font-medium">
               You haven't published any routes today.
            </div>
          )}
        </div>
      )}

      {isFindSheetOpen && (
        <div className="fixed inset-0 z-[60] flex items-end bg-slate-900/30" role="dialog" aria-modal="true" aria-label="Find a ride">
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-slate-50 p-4 pb-8 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300" />
            <button type="button" onClick={() => setIsFindSheetOpen(false)} className="mb-3 text-sm font-semibold text-gray-500">Close</button>
            {nearbyOffers === null ? (
              <LocationFlow onRouteConfirmed={handleRouteConfirmed} />
            ) : isSearchingRides ? (
              <div className="rounded-3xl bg-white p-8 text-center font-semibold text-gray-600 shadow-sm">Searching nearby rides...</div>
            ) : (
              <div className="mx-auto max-w-md space-y-4">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-sm font-bold text-gray-800">{searchedRoute?.pickup}</p>
                  <p className="my-1 text-gray-300">⋮</p>
                  <p className="text-sm font-bold text-gray-800">{searchedRoute?.destination}</p>
                </div>
                <h2 className="font-bold text-gray-800">Nearby Ride Offers</h2>
                {nearbyOffers.length === 0 ? (
                  <div className="rounded-2xl bg-white p-6 text-center text-gray-500 shadow-sm">No rides are available right now.</div>
                ) : nearbyOffers.map((offer) => (
                  <div key={offer.id} className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex justify-between">
                      <div><p className="font-bold text-gray-900">Driver: {offer.driver_name || `Driver ${offer.driver_id}`}</p><p className="text-sm text-gray-500">{offer.available_seats} seats available</p></div>
                      <p className="text-lg font-extrabold text-emerald-600">₹{offer.price_per_seat}</p>
                    </div>
                    <button type="button" onClick={() => navigate('/find-ride', { state: { selectedOffer: offer } })} className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700">Book</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION (Static mockup) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
        <button className="flex flex-col items-center text-syncro-dark">
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3l10 9h-3v9h-14v-9h-3l10-9z"/></svg>
          <span className="text-[10px] font-bold">Home</span>
        </button>
        {/* ... remaining nav icons ... */}
      </div>
    </div>
  );
}
