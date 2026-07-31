import React from 'react';
import { Phone, MessageSquare, XCircle, Star, CarFront, ShieldCheck } from 'lucide-react';

interface DriverDetails {
  name: string;
  rating: number;
  phone: string;
  trips_completed: number;
}

interface VehicleDetails {
  make: string;
  model: string;
  color: string;
  license_plate: string;
}

interface PassengerActiveRideProps {
  driver: DriverDetails;
  vehicle: VehicleDetails;
  eta: string;
  onCancel: () => void;
  onMessage: () => void;
}

export const PassengerActiveRide: React.FC<PassengerActiveRideProps> = ({ 
  driver, 
  vehicle, 
  eta, 
  onCancel, 
  onMessage 
}) => {

  const handleCall = () => {
    // Opens the phone's native dialer
    window.open(`tel:${driver.phone}`);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mt-6">
      
      {/* 🟢 Status Header */}
      <div className="bg-green-600 px-6 py-4 text-white flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Ride Confirmed</h2>
          <p className="text-green-100 text-sm">Arriving in ~{eta}</p>
        </div>
        <div className="bg-white/20 p-2 rounded-full animate-pulse">
          <CarFront size={24} className="text-white" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* 👤 Driver Info Card */}
        <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="h-16 w-16 bg-slate-200 rounded-full flex items-center justify-center text-2xl font-bold text-slate-500">
            {driver.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1">
              {driver.name}
              <ShieldCheck size={16} className="text-blue-500" />
            </h3>
            <div className="flex items-center text-sm text-slate-600 mt-1">
              <Star size={16} className="text-amber-500 fill-amber-500 mr-1" />
              <span className="font-semibold text-slate-700 mr-1">{driver.rating}</span>
              <span>({driver.trips_completed} trips)</span>
            </div>
          </div>
        </div>

        {/* 🚗 Vehicle Info Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Vehicle</p>
            <p className="text-lg font-bold text-slate-800">
              {vehicle.color} {vehicle.make} {vehicle.model}
            </p>
          </div>
          <div className="bg-slate-200 px-3 py-1.5 rounded-md border-2 border-slate-300">
            <p className="text-slate-800 font-mono font-bold tracking-widest uppercase">
              {vehicle.license_plate}
            </p>
          </div>
        </div>

        {/* 🔘 Action Buttons */}
        <div className="flex justify-between gap-3 pt-2">
          
          {/* Call Button */}
          <button 
            onClick={handleCall}
            className="flex-1 flex flex-col items-center justify-center py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <Phone size={24} className="mb-1" />
            <span className="text-sm font-semibold">Call</span>
          </button>

          {/* Message Button */}
          <button 
            onClick={onMessage}
            className="flex-1 flex flex-col items-center justify-center py-3 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors"
          >
            <MessageSquare size={24} className="mb-1" />
            <span className="text-sm font-semibold">Message</span>
          </button>

          {/* Cancel Button */}
          <button 
            onClick={onCancel}
            className="flex-1 flex flex-col items-center justify-center py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
          >
            <XCircle size={24} className="mb-1" />
            <span className="text-sm font-semibold">Cancel</span>
          </button>
          
        </div>
      </div>
    </div>
  );
};