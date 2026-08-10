import { MapPin, ShieldCheck, Star } from "lucide-react";
import ProfileAvatar from "./ProfileAvatar";

interface ProfileHeaderProps {
  name: string;
  email: string;
  rating: number;
  memberSince?: string;
  location?: string;
  completedTrips?: number;
  isDriver?: boolean;
  verified?: boolean;
  avatar?: string;
  onEditAvatar?: () => void;
}

export default function ProfileHeader({
  name,
  email,
  rating,
  memberSince = "2026",
  location = "Hyderabad",
  completedTrips = 0,
  isDriver = false,
  verified = false,
  avatar,
  onEditAvatar,
}: ProfileHeaderProps) {
  return (
    <div className="bg-white rounded-b-3xl shadow-sm">

      {/* Cover */}
      <div className="h-36 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-b-3xl"></div>

      {/* Profile */}
      <div className="px-6 pb-6">

        <div className="-mt-14 flex flex-col items-center">

          <ProfileAvatar
            image={avatar}
            verified={verified}
            onEdit={onEditAvatar}
          />

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            {name}
          </h1>

          <p className="text-gray-500 text-sm mt-1">
            {email}
          </p>

          {/* Rating */}
          <div className="flex items-center mt-3 gap-2">

            <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-full">
              <Star
                size={16}
                className="text-yellow-500 fill-yellow-500 mr-1"
              />

              <span className="font-semibold">
                {rating.toFixed(1)}
              </span>
            </div>

            <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
              {isDriver ? "Driver" : "Passenger"}
            </div>

            {verified && (
              <div className="flex items-center bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                <ShieldCheck size={14} className="mr-1" />
                Verified
              </div>
            )}

          </div>

          {/* Member */}
          <div className="flex items-center text-gray-500 text-sm mt-3">

            <MapPin size={16} className="mr-1" />

            {location}

            <span className="mx-2">•</span>

            Member since {memberSince}

          </div>

        </div>

        {/* Stats */}

        <div className="grid grid-cols-3 gap-4 mt-8">

          <div className="bg-slate-50 rounded-2xl p-4 text-center">

            <h2 className="text-2xl font-bold text-blue-600">
              {completedTrips}
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              Trips
            </p>

          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-center">

            <h2 className="text-2xl font-bold text-green-600">
              {rating.toFixed(1)}
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              Rating
            </p>

          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-center">

            <h2 className="text-2xl font-bold text-purple-600">
              100%
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              Verified
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}