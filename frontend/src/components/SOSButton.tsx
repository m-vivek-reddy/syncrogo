import { useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { apiClient } from "../api/client";

interface SOSButtonProps {
  userId: number;
  rideId?: number;
  latitude: number;
  longitude: number;
}

export default function SOSButton({
  userId,
  rideId,
  latitude,
  longitude,
}: SOSButtonProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSOS = async () => {
    const confirmSOS = window.confirm(
      "Are you sure you want to trigger an Emergency SOS?\n\nThis will immediately notify SyncroGo administrators."
    );

    if (!confirmSOS) return;

    try {
      setLoading(true);

      await apiClient.post("/api/v1/sos/trigger", {
        user_id: userId,
        ride_id: rideId,
        latitude,
        longitude,
      });

      setSent(true);

      alert(
        "Emergency alert has been sent successfully.\nStay calm. Help is on the way."
      );
    } catch (error) {
      console.error(error);

      alert(
        "Unable to send SOS.\nPlease call emergency services immediately."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      disabled={loading || sent}
      onClick={handleSOS}
      className={`
        w-full
        rounded-2xl
        py-4
        font-bold
        flex
        items-center
        justify-center
        gap-3
        transition
        duration-300
        shadow-lg

        ${
          sent
            ? "bg-green-600 text-white"
            : "bg-red-600 hover:bg-red-700 text-white animate-pulse"
        }

        disabled:opacity-70
      `}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" size={22} />
          Sending SOS...
        </>
      ) : sent ? (
        <>
          <ShieldAlert size={22} />
          SOS Alert Active
        </>
      ) : (
        <>
          <ShieldAlert size={22} />
          EMERGENCY SOS
        </>
      )}
    </button>
  );
}