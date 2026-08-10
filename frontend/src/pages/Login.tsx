import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithFastAPI } from '../api/auth';
import { apiClient } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  
  // State to hold the user's input
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // The function you asked about!
 const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  setIsLoading(true);
  setErrorMessage("");

  const result = await loginWithFastAPI(email, password);

  if (result.success) {

    try {

const response = await apiClient.get("/api/v1/users/me");

console.log("PROFILE:", response.data);
console.log("ROLE:", response.data.role);

if (response.data.role === "admin") {
  console.log("Redirecting to admin...");
  navigate("/admin");
} else {
  console.log("Redirecting to home...");
  navigate("/home");
}

    } catch (err) {

      navigate("/home");

    }

  } else {

    setErrorMessage(result.error || "Login failed");

  }

  setIsLoading(false);
};
  return (
    <div className="min-h-screen bg-slate-50 text-syncro-dark flex flex-col p-6 font-sans">
      
      {/* Back Button */}
      <button onClick={() => navigate('/')} className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center border border-gray-200 mt-4 mb-8">
        <svg className="w-6 h-6 text-syncro-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-poppins font-bold tracking-tight mb-2">Welcome Back</h1>
        <p className="text-gray-500 font-medium">Log in to your SyncroGo account</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="flex flex-col gap-5 flex-grow">
        
        {/* Error Message Display */}
        {errorMessage && (
          <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-medium border border-red-100">
            {errorMessage}
          </div>
        )}

        <div className="relative">
          <p className="text-sm font-bold text-gray-700 mb-1 ml-1">Email</p>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com" 
            required
            className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-syncro-blue focus:ring-1 focus:ring-syncro-blue" 
          />
        </div>

        <div className="relative">
          <p className="text-sm font-bold text-gray-700 mb-1 ml-1">Password</p>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" 
            required
            className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-syncro-blue focus:ring-1 focus:ring-syncro-blue" 
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-syncro-dark text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-gray-800 transition-colors text-lg mt-6 flex justify-center items-center"
        >
          {isLoading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
}