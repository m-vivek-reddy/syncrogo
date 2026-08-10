import { CarFront, ShieldCheck, CircleCheck } from "lucide-react";

interface DriverStatusCardProps {
  isDriverMode: boolean;
  vehicleVerified?: boolean;
  documentsVerified?: boolean;
}

export default function DriverStatusCard({
  isDriverMode,
  vehicleVerified = false,
  documentsVerified = true,
}: DriverStatusCardProps) {
  if (!isDriverMode) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
          <CarFront className="text-blue-600" size={22} />
        </div>

        <div>
          <h3 className="font-bold text-gray-900">
            Driver Verification
          </h3>
          <p className="text-xs text-gray-500">
            Complete verification to publish rides.
          </p>
        </div>
      </div>

      <div className="space-y-3">

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            Driving License
          </span>

          {documentsVerified ? (
            <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
              <CircleCheck size={16} />
              Verified
            </span>
          ) : (
            <span className="text-orange-500 text-sm font-semibold">
              Pending
            </span>
          )}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            Vehicle Documents
          </span>

          {vehicleVerified ? (
            <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
              <ShieldCheck size={16} />
              Approved
            </span>
          ) : (
            <span className="text-orange-500 text-sm font-semibold">
              Pending Review
            </span>
          )}
        </div>

      </div>
    </div>
  );
}