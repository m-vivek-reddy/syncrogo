import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore'; // <-- Import the store


export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Destructure exactly what we need from the global store
  const { isDriverMode, toggleDriverMode } = useAppStore();

  return (
    <div className="min-h-screen bg-slate-50 text-syncro-dark font-sans pb-20">
      
      {/* Top Navigation Bar */}
     <header className="bg-white h-20 px-6 flex justify-between items-center sticky top-0 z-50 border-b shadow-sm">
<div
  onClick={() => navigate("/home")}
  className="cursor-pointer flex flex-col"
>
  <h1 className="text-3xl font-extrabold tracking-tight">
    <span className="text-[#111827]">Syncro</span>
    <span className="text-[#22C55E]">Go</span>
  </h1>

 <p className="text-[8px] text-gray-500 -mt-1">
  Share Rides.Save More.<span className="text-green-500">Go Together.</span>
</p>
</div>
        {/* The Magic Mode Switcher (Now powered by Zustand!) */}
        <button
          onClick={toggleDriverMode}
          className={`px-4 py-2 rounded-full font-semibold text-sm transition-all flex items-center gap-2 ${
            isDriverMode 
              ? 'bg-green-50 text-syncro-green border border-green-200' 
              : 'bg-blue-50 text-syncro-blue border border-blue-200'
          }`}
        >
          {isDriverMode ? '🚙 Driver' : '🚗 Passenger'} ▼
        </button>
      </header>

      {/* Dynamic Page Content */}
      <main>
        {/* We no longer need to pass context down! Any page can just import the store */}
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
        <button onClick={() => navigate('/home')} className={`flex flex-col items-center gap-1 ${location.pathname === '/home' ? 'text-syncro-dark' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[10px] font-bold">Home</span>
        </button>

        <button onClick={() => navigate('/trips')} className={`flex flex-col items-center gap-1 ${location.pathname === '/trips' ? 'text-syncro-dark' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724a1 1 0 01-.553-.894V4.224a1 1 0 01.553-.894L9 6l5.447-2.724a1 1 0 01.553.894v13.153a1 1 0 01-.553.894L9 20z" /></svg>
          <span className="text-[10px] font-medium">Trips</span>
        </button>

        <button onClick={() => navigate('/messages')} className={`flex flex-col items-center gap-1 ${location.pathname === '/messages' ? 'text-syncro-dark' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <span className="text-[10px] font-medium">Messages</span>
        </button>

        <button onClick={() => navigate('/profile')} className={`flex flex-col items-center gap-1 ${location.pathname === '/profile' ? 'text-syncro-dark' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </nav>
      
    </div>
  );
}