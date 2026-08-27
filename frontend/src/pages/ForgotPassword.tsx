import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await apiClient.post("/api/v1/users/forgot-password", { email });
      setMessage(response.data.message);
    } catch (error) {
      console.error("Forgot password error:", error);
      setErrorMessage(
        "Unable to process your request. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 bg-gray-50">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate("/login")}
        className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center border border-gray-200 mt-4 mb-8"
      >
        <svg
          className="w-6 h-6 text-syncro-dark"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-poppins font-bold tracking-tight mb-2">
          Forgot Password?
        </h1>

        <p className="text-gray-500 font-medium">
          Enter your email address and we'll help you reset your password.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        {/* Success Message */}
        {message && (
          <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm font-medium border border-green-100">
            {message}
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-medium border border-red-100">
            {errorMessage}
          </div>
        )}

        {/* Email */}
        <div>
          <p className="text-sm font-bold text-gray-700 mb-1 ml-1">
            Email
          </p>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-syncro-blue focus:ring-1 focus:ring-syncro-blue"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-syncro-dark text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-gray-800 transition-colors text-lg mt-4 flex justify-center items-center disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Send Reset Instructions"}
        </button>

        {/* Back to Login */}
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="text-syncro-blue font-semibold text-sm hover:underline mt-2"
        >
          Back to Login
        </button>
      </form>
    </div>
  );
}
