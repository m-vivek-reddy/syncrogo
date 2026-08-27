import { Camera, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { API_BASE_URL } from "../../api/config";

interface ProfileAvatarProps {
  image?: string;
  verified?: boolean;
  onEdit?: () => void;
  disabled?: boolean;
}

export default function ProfileAvatar({
  image,
  verified = false,
  onEdit,
  disabled = false,
}: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const resolveImageUrl = (src?: string) => {
    if (!src) return undefined;
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:") || src.startsWith("blob:")) {
      return src;
    }
    const cleanBase = API_BASE_URL.replace(/\/+$/, "");
    const cleanPath = src.startsWith("/") ? src : `/${src}`;
    return `${cleanBase}${cleanPath}`;
  };

  const resolvedSrc = resolveImageUrl(image);

  return (
    <div className="relative w-24 h-24">
      {/* Avatar */}
      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-100">
        {resolvedSrc && !imageError ? (
          <img
            src={resolvedSrc}
            alt="Profile"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UserRound size={42} className="text-slate-500" />
          </div>
        )}
      </div>

      {/* Edit Button */}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          aria-label="Change profile photo"
          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md hover:bg-blue-700 transition"
        >
          <Camera size={16} />
        </button>
      )}

      {/* Verification Badge */}
      {verified && (
        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1 border-2 border-white">
          <ShieldCheck size={14} />
        </div>
      )}
    </div>
  );
}
