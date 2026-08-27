import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { primeCurrentUser } from "../api/currentUser";
import { useAppStore } from "../store/useAppStore";
import { ShieldCheck, ArrowRight, Loader } from "lucide-react";

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(
    location.state?.email || localStorage.getItem("verify_email") || ""
  );

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanEmail) {
      setError("Please provide your email address");
      return;
    }

    if (cleanOtp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post("/api/v1/users/verify-otp", {
        email: cleanEmail,
        otp: cleanOtp,
      });

      setSuccess("Email verified successfully!");
      localStorage.removeItem("verify_email");

      const { access_token, user: profile } = response.data || {};
      const savedToken = access_token || localStorage.getItem("syncrogo_token") || localStorage.getItem("token");

      if (savedToken) {
        localStorage.setItem("syncrogo_token", savedToken);
        localStorage.setItem("token", savedToken);
        if (profile) {
          primeCurrentUser(savedToken, profile);
          useAppStore.getState().login({
            id: String(profile.id),
            name: profile.name || profile.full_name || profile.email,
            email: profile.email,
            rating: profile.rating ?? 0,
            role: profile.role,
            profile_photo_url: profile.profile_photo_url,
          });
        }
        const role = profile?.role?.toLowerCase();
        const isAdminOrEmployer = role === "admin" || role === "employer";
        navigate(isAdminOrEmployer ? "/admin" : "/home", { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || "OTP verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your email address to resend OTP");
      return;
    }

    setResending(true);
    setError("");

    try {
      const response = await apiClient.post(
        "/api/v1/users/resend-otp",
        {
          email: cleanEmail,
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-indigo-600" size={32} />
          </div>

          <h2 className="text-2xl font-bold text-slate-800">
            Verify Email
          </h2>

          <p className="text-gray-500 mt-2 text-sm">
            Enter the 6-digit OTP sent to
          </p>

          {email ? (
            <p className="font-semibold text-indigo-600 mt-1">
              {email}
            </p>
          ) : (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="mt-2 w-full px-3 py-2 text-sm border rounded-xl text-center"
            />
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-3 mb-4 text-sm font-medium border border-red-100 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 rounded-xl p-3 mb-4 text-sm font-medium border border-green-100 text-center">
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
            className="w-full text-center text-3xl tracking-[10px] py-4 border rounded-2xl mb-6 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono font-bold"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-semibold flex justify-center items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {loading ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              <>
                Verify & Continue
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <button
          onClick={handleResendOTP}
          disabled={resending}
          className="w-full mt-4 border border-indigo-600 text-indigo-600 py-3 rounded-2xl font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-60"
        >
          {resending ? "Sending..." : "Resend OTP"}
        </button>

        <div className="text-center mt-6">
          <Link to="/login" className="text-sm text-gray-500 hover:text-indigo-600 font-medium">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}