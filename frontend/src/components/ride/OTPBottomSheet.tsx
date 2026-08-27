import { useEffect, useState } from "react";

interface OTPBottomSheetProps {
  open: boolean;
  loading?: boolean;
  error?: string | null;
  onVerify: (otp: string) => void;
  onClose?: () => void;
}

export default function OTPBottomSheet({
  open,
  loading = false,
  error = null,
  onVerify,
  onClose,
}: OTPBottomSheetProps) {
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (open) {
      setOtp("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value
      .replace(/\D/g, "")
      .slice(0, 6);

    setOtp(value);
  };

  const handleVerify = () => {
    if (otp.length !== 6 || loading) {
      return;
    }

    onVerify(otp);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/40">
      {/* Bottom Sheet */}
      <div
        className="
          w-full
          max-w-lg
          rounded-t-[32px]
          bg-white
          px-5
          pb-8
          pt-4
          shadow-2xl
          animate-in
          slide-in-from-bottom
          duration-300
        "
      >
        {/* Handle */}
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-300" />

        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Confirm Passenger
            </h2>

            <p className="mt-1 text-sm leading-5 text-gray-500">
              Ask the passenger for their 6-digit OTP
              before starting the ride.
            </p>
          </div>

          {onClose && !loading && (
            <button
              type="button"
              onClick={onClose}
              className="
                ml-3
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-gray-100
                text-lg
                text-gray-600
                transition
                hover:bg-gray-200
              "
            >
              ✕
            </button>
          )}
        </div>

        {/* OTP Input */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Passenger OTP
          </label>

          <input
            value={otp}
            onChange={handleChange}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            placeholder="000000"
            disabled={loading}
            className="
              w-full
              rounded-2xl
              border
              border-gray-300
              bg-gray-50
              px-4
              py-4
              text-center
              text-3xl
              font-bold
              tracking-[0.5em]
              text-gray-900
              outline-none
              transition
              focus:border-blue-600
              focus:bg-white
              focus:ring-4
              focus:ring-blue-100
              disabled:opacity-60
            "
          />
        </div>

        {/* OTP Counter */}
        <div className="mb-4 text-center text-sm text-gray-500">
          {otp.length}/6 digits entered
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">⚠️</span>

              <div>
                <p className="font-semibold text-red-700">
                  Verification failed
                </p>

                <p className="mt-1 text-sm text-red-600">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Verify Button */}
        <button
          type="button"
          disabled={otp.length !== 6 || loading}
          onClick={handleVerify}
          className="
            w-full
            rounded-2xl
            bg-blue-600
            py-4
            text-base
            font-bold
            text-white
            shadow-lg
            shadow-blue-600/20
            transition
            hover:bg-blue-700
            active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:bg-gray-300
            disabled:shadow-none
          "
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span
                className="
                  h-5
                  w-5
                  animate-spin
                  rounded-full
                  border-2
                  border-white/30
                  border-t-white
                "
              />

              Verifying OTP...
            </span>
          ) : (
            "Verify OTP & Start Ride"
          )}
        </button>

        {/* Information */}
        <p className="mt-4 text-center text-xs leading-5 text-gray-400">
          The ride will start only after the passenger's
          OTP is successfully verified.
        </p>
      </div>
    </div>
  );
}