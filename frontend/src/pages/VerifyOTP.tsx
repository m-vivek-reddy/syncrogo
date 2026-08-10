import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { ShieldCheck, ArrowRight, Loader } from "lucide-react";

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();

  const email =
    location.state?.email || localStorage.getItem("verify_email") || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post("/api/v1/users/verify-otp", {
        email,
        otp,
      });

      console.log(response.data);

      setSuccess("Email verified successfully!");

      localStorage.removeItem("verify_email");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err: any) {
      console.error(err);

      setError(
        err.response?.data?.detail || "OTP verification failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) return;

    setResending(true);
    setError("");

    try {
      const response = await apiClient.post(
        "/api/v1/users/resend-otp",
        {
          email,
        }
      );

      alert(response.data.message || "OTP sent successfully");
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Failed to resend OTP"
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-indigo-600" size={32} />
          </div>

          <h2 className="text-2xl font-bold">
            Verify Email
          </h2>

          <p className="text-gray-500 mt-2">
            Enter the OTP sent to
          </p>

          <p className="font-semibold text-indigo-600">
            {email}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 rounded-xl p-3 mb-4 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 text-green-700 rounded-xl p-3 mb-4 text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleVerify}>
          <input
            type="text"
            value={otp}
            maxLength={6}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, ""))
            }
            placeholder="000000"
            className="w-full text-center text-3xl tracking-[10px] py-4 border rounded-2xl mb-6"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-semibold flex justify-center items-center gap-2"
          >
            {loading ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              <>
                Verify
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <button
          onClick={handleResendOTP}
          disabled={resending}
          className="w-full mt-4 border border-indigo-600 text-indigo-600 py-3 rounded-2xl font-semibold"
        >
          {resending ? "Sending..." : "Resend OTP"}
        </button>
      </div>
    </div>
  );
}