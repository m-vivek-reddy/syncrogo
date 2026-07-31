import { CheckCircle } from 'lucide-react'; // Make sure you have lucide-react installed

interface RideReceiptProps {
  rideDetails: {
    pickup: string;
    dropoff: string;
    driverName: string;
    amountPaid: number;
    transactionId: string;
  };
  onClose: () => void;
}

export default function RideReceipt({ rideDetails, onClose }: RideReceiptProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up">
        
        {/* Success Header */}
        <div className="bg-green-500 p-6 flex flex-col items-center text-white">
          <CheckCircle size={64} className="mb-4 text-white" />
          <h2 className="text-2xl font-bold">Payment Successful!</h2>
          <p className="text-green-100 mt-1">Your seat is confirmed.</p>
        </div>

        {/* Receipt Details */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <span className="text-gray-500 text-sm">Amount Paid</span>
            <span className="text-2xl font-bold text-gray-900">₹{rideDetails.amountPaid}</span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Transaction ID</p>
              <p className="text-sm font-medium text-gray-800">{rideDetails.transactionId}</p>
            </div>
            
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Driver</p>
              <p className="text-sm font-medium text-gray-800">{rideDetails.driverName}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl mt-4">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0"></div>
                <p className="text-sm text-gray-700">{rideDetails.pickup}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full border-2 border-red-500 mt-1.5 shrink-0"></div>
                <p className="text-sm text-gray-700">{rideDetails.dropoff}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full mt-6 bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-black transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}