import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerWithFastAPI } from '../api/auth';

export default function Register() {
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Controls password masking
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    
    // 1. Send data to FastAPI to create the user
    const regResult = await registerWithFastAPI(name, email, password);
    
    if (regResult.success) {
      // 2. If creation is successful, send them to the OTP screen!
      // We pass the email in the state so the OTP page knows who is verifying.
      localStorage.setItem("verify_email", email);
      navigate('/verify-otp', { state: { email: email } });
    } else {
      setErrorMessage(regResult.error || 'Registration failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-syncro-dark flex flex-col p-6 font-sans">
      
      <button onClick={() => navigate('/')} className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center border border-gray-200 mt-4 mb-8">
        <svg className="w-6 h-6 text-syncro-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>

      <div className="mb-10">
        <h1 className="text-4xl font-poppins font-bold tracking-tight mb-2">Create Account</h1>
        <p className="text-gray-500 font-medium">Join SyncroGo and start riding</p>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-5 flex-grow">
        
        {errorMessage && (
          <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-medium border border-red-100">
            {errorMessage}
          </div>
        )}

        <div className="relative">
          <p className="text-sm font-bold text-gray-700 mb-1 ml-1">Full Name</p>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe" 
            required
            className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-syncro-blue focus:ring-1 focus:ring-syncro-blue" 
          />
        </div>

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
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required
              minLength={6}
              className="w-full pl-4 pr-12 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-syncro-blue focus:ring-1 focus:ring-syncro-blue" 
            />
            {/* Password Visibility Toggle */}
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-syncro-dark text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-gray-800 transition-colors text-lg mt-6 flex justify-center items-center"
        >
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
}