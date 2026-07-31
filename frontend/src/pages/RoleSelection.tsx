import { useNavigate } from 'react-router-dom';

export default function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 text-syncro-dark p-6 pt-16 font-sans flex flex-col">
      <h1 className="text-3xl font-poppins font-bold">
        Welcome <span className="text-syncro-green">Alexander</span>,
      </h1>
      <p className="text-gray-500 mt-2 text-lg mb-10">What would you like to do today?</p>
      
      <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
        
        {/* Find a Ride Card */}
        <button 
          onClick={() => navigate('/find-ride')}
          className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-4 hover:shadow-lg hover:border-syncro-blue transition-all group text-center cursor-pointer"
        >
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-syncro-blue transition-colors">
            {/* Search Icon */}
            <svg className="w-10 h-10 text-syncro-blue group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-syncro-dark">Find a Ride</h2>
            <p className="text-gray-500 text-base mt-2">Book a seat and travel together</p>
          </div>
        </button>

        {/* Offer a Ride Card */}
        <button 
          onClick={() => navigate('/offer-ride')}
          className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-4 hover:shadow-lg hover:border-syncro-green transition-all group text-center cursor-pointer"
        >
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center group-hover:bg-syncro-green transition-colors">
            {/* Car/Navigation Icon */}
            <svg className="w-10 h-10 text-syncro-green group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-syncro-dark">Offer a Ride</h2>
            <p className="text-gray-500 text-base mt-2">Share your journey and save costs</p>
          </div>
        </button>

      </div>
    </div>
  );
}