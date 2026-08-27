import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState(token ? "" : "This password reset link is invalid or incomplete.");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiClient.post("/api/v1/users/reset-password", { token, new_password: password });
      setMessage(response.data.message);
      setPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const detail = typeof error === "object" && error !== null && "response" in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      setErrorMessage(detail || "Unable to reset your password. Please request a new link.");
    } finally {
      setIsLoading(false);
    }
  };

  return <div className="min-h-screen flex flex-col px-6 bg-gray-50">
    <button type="button" onClick={() => navigate("/login")} className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center border border-gray-200 mt-4 mb-8" aria-label="Back to login">←</button>
    <div className="mb-10"><h1 className="text-4xl font-poppins font-bold tracking-tight mb-2">Create new password</h1><p className="text-gray-500 font-medium">Choose a new password with at least 8 characters.</p></div>
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {message && <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm font-medium border border-green-100">{message}</div>}
      {errorMessage && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-medium border border-red-100">{errorMessage}</div>}
      {!message && <><div><label className="text-sm font-bold text-gray-700 mb-1 ml-1 block" htmlFor="new-password">New password</label><input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-syncro-blue" /><PasswordStrengthMeter password={password} /></div>
      <div><label className="text-sm font-bold text-gray-700 mb-1 ml-1 block" htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-syncro-blue" /></div>
      <button type="submit" disabled={isLoading || !token} className="w-full bg-syncro-dark text-white font-bold py-4 rounded-2xl shadow-lg disabled:opacity-60">{isLoading ? "Resetting..." : "Reset Password"}</button></>}
      <button type="button" onClick={() => navigate("/login")} className="text-syncro-blue font-semibold text-sm hover:underline mt-2">Back to Login</button>
    </form>
  </div>;
}
