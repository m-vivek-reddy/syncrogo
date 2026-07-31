import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { cancelBookingWithBackend, fetchActiveDriverRide, fetchDriverBookings, fetchPassengerBookings } from '../api/auth';
import RideMap from '../components/RideMap';
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
  const { isDriverMode } = useAppStore();
  
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [passengerBookings, setPassengerBookings] = useState<any[]>([]);
  const [driverBookings, setDriverBookings] = useState<any[]>([]);
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20">
      {/* MAP PLACEHOLDER */}
      <div className="h-48 z-0 relative shadow-inner">
         <RideMap />
      </div>

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

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
             <div>
                <p className="text-xs text-gray-400 font-bold mb-1">Current Status</p>
                <p className="font-bold text-gray-700">Looking for a ride</p>
             </div>
             <span className="text-3xl">👋</span>
          </div>

          <button 
            onClick={() => navigate('/find-ride')}
            className="w-full bg-syncro-blue text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 mb-8"
          >
            🔍 Find a Ride
          </button>

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
