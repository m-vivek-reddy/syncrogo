import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginWithFastAPI } from "../api/auth";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return;

    setIsLoading(true);
    setErrorMessage("");
    setNeedsOtp(false);

    try {
      const result = await loginWithFastAPI(cleanEmail, password);

      if (result.success) {
        const isAdminOrEmployer = result.role === "admin" || result.role === "employer";
        navigate(isAdminOrEmployer ? "/admin" : "/home", { replace: true });
      } else {
        const errorText = result.error || "Login failed";
        setErrorMessage(errorText);
        if (
          errorText.toLowerCase().includes("verification") ||
          errorText.toLowerCase().includes("otp") ||
          result.status === 403
        ) {
          setNeedsOtp(true);
          localStorage.setItem("verify_email", cleanEmail);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToOtp = () => {
    const cleanEmail = email.trim().toLowerCase();
    localStorage.setItem("verify_email", cleanEmail);
    navigate("/verify-otp", { state: { email: cleanEmail } });
  };

  return (
    <div className="min-h-screen flex flex-col px-6 bg-slate-50 text-syncro-dark font-sans justify-between py-6">
      <div>
        {/* Back Button */}
        <button
          onClick={() => navigate("/login")}
          className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center border border-gray-200 mt-2 mb-6"
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
        <div className="mb-8">
          <h1 className="text-4xl font-poppins font-bold tracking-tight mb-2">
            Welcome Back
          </h1>

          <p className="text-gray-500 font-medium">
            Log in to your SyncroGo account
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-5"
        >
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100 flex flex-col gap-2">
              <p>{errorMessage}</p>
              {needsOtp && (
                <button
                  type="button"
                  onClick={handleGoToOtp}
                  className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-xl text-xs hover:bg-indigo-700 transition-colors w-fit"
                >
                  Verify OTP Now →
                </button>
              )}
            </div>
          )}

          {/* Email */}
          <div className="relative">
            <p className="text-sm font-bold text-gray-700 mb-1 ml-1">
              Email
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoCapitalize="none"
              className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-syncro-blue focus:ring-1 focus:ring-syncro-blue"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1 ml-1">
              <p className="text-sm font-bold text-gray-700">
                Password
              </p>

              {/* Forgot Password */}
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-sm font-semibold text-syncro-blue hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-4 pr-12 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-syncro-blue focus:ring-1 focus:ring-syncro-blue"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none text-sm font-medium"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-syncro-dark text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-gray-800 transition-colors text-lg mt-4 flex justify-center items-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </div>

      {/* Footer / Register Link */}
      <div className="text-center py-4">
        <p className="text-gray-600 text-sm">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-indigo-600 font-bold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
