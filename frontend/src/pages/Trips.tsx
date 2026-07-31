import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { apiClient } from '../api/client';

export default function Trips() {
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await apiClient.get('/api/v1/trips/history');
        if (res.status === 200 && res.data && res.data.success) {
          setTrips(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load trip history', err);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div className="max-w-md mx-auto p-4 pb-20 bg-gray-50 min-h-screen">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Trip History & Receipts</h1>
      
      <div className="flex flex-col gap-3">
        {trips.length > 0 ? (
          trips.map((trip) => (
            <div key={trip.booking_id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md uppercase">
                  {trip.status}
                </span>
                <span className="font-bold text-syncro-green">₹{trip.price}</span>
              </div>
              
              <div>
                <p className="text-xs text-gray-400">Driver: {trip.driver_name}</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">From: {trip.pickup_location}</p>
                <p className="text-sm font-semibold text-gray-600 mt-0.5">To: {trip.dropoff_location}</p>
              </div>

              <button 
                onClick={() => setSelectedReceipt(trip)}
                className="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Receipt size={16} /> View Digital Receipt
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-gray-400 font-medium">No past trips recorded yet.</div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl flex flex-col gap-4">
            <div className="text-center border-b border-gray-100 pb-3">
              <h2 className="font-bold text-lg text-gray-900">SyncroGo E-Receipt</h2>
              <p className="text-xs text-gray-400">Transaction ID: {selectedReceipt.payment_id}</p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Driver:</span> <span className="font-semibold">{selectedReceipt.driver_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Fare Paid:</span> <span className="font-bold text-syncro-green">₹{selectedReceipt.price}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status:</span> <span className="font-semibold uppercase text-green-600">{selectedReceipt.status}</span></div>
            </div>
            <button 
              onClick={() => setSelectedReceipt(null)}
              className="w-full bg-syncro-dark text-white font-bold py-3 rounded-2xl hover:bg-black transition-colors"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
