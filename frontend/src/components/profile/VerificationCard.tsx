import {
  BadgeCheck,
  Mail,
  CreditCard,
  Car,
  Clock3,
} from "lucide-react";

interface VerificationCardProps {
  emailVerified?: boolean;
  aadhaarVerified?: boolean;
  drivingLicenseVerified?: boolean;
  vehicleVerified?: boolean;
  isDriver?: boolean;
}

export default function VerificationCard({
  emailVerified = false,
  aadhaarVerified = false,
  drivingLicenseVerified = false,
  vehicleVerified = false,
  isDriver = false,
}: VerificationCardProps) {
  const verifiedCount =
    (emailVerified ? 1 : 0) +
    (aadhaarVerified ? 1 : 0) +
    (drivingLicenseVerified ? 1 : 0) +
    (isDriver ? (vehicleVerified ? 1 : 0) : 1);

  const total = isDriver ? 4 : 3;

  const progress = (verifiedCount / total) * 100;

  const Status = ({
    icon: Icon,
    title,
    verified,
  }: {
    icon: any;
    title: string;
    verified: boolean;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            verified
              ? "bg-green-100 text-green-600"
              : "bg-yellow-100 text-yellow-600"
          }`}
        >
          <Icon size={20} />
        </div>

        <div>
          <h3 className="font-semibold text-slate-800">
            {title}
          </h3>

          <p className="text-xs text-slate-500">
            {verified ? "Verified" : "Pending"}
          </p>
        </div>
      </div>

      {verified ? (
        <BadgeCheck className="text-green-600" size={22} />
      ) : (
        <Clock3 className="text-yellow-500" size={22} />
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 mx-5 mt-5">

      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-lg">
          Verification Status
        </h2>

        <span className="font-bold text-blue-600">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      <Status
        icon={Mail}
        title="Email"
        verified={emailVerified}
      />

      <Status
        icon={CreditCard}
        title="Aadhaar"
        verified={aadhaarVerified}
      />

      <Status
        icon={BadgeCheck}
        title="Driving License"
        verified={drivingLicenseVerified}
      />

      {isDriver && (
        <Status
          icon={Car}
          title="Vehicle Documents"
          verified={vehicleVerified}
        />
      )}
    </div>
  );
}