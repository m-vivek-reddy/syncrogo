import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { apiClient } from '../api/client';

interface ChatPreview {
  name: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  rideId: number;
  receiverId: number;
  email: string;
  role: string;
  phone: string;
}

export default function Messages() {
  const navigate = useNavigate();
  const { isDriverMode, user } = useAppStore();
  const [loadedChats, setLoadedChats] = useState<ChatPreview[]>([]);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const loadConversations = async () => {
      const token = localStorage.getItem('syncrogo_token') || localStorage.getItem('token');
      if (!token) {
        setAuthError('Please sign in to view your conversations.');
        return;
      }

      try {
        const response = await apiClient.get('/chat/conversations');
        setLoadedChats(response.data);
        setAuthError('');
      } catch (error: any) {
        if (error.response?.status === 401) {
          setAuthError('Your session has expired. Please sign in again.');
          return;
        }
        console.error('Unable to load conversations:', error);
      }
    };

    void loadConversations();
  }, []);

  const recentChats = [
    {
      id: 1,
      name: isDriverMode ? "Alex (Passenger)" : "Driver Sarah",
      lastMessage: "Got it! See you soon.",
      time: "05:08 PM",
      unread: true,
      
      // ✅ FIXED: These now match your real Supabase database records!
      rideId: 1, 
      receiverId: isDriverMode ? 1 : 2, 
      
      phone: "1234567890"
    }
  ];
  void recentChats;

  const openChat = (chat: any) => {
    // Current logged-in user: Driver is 2, Passenger is 1
    const currentUserId = Number(user?.id);

    navigate('/message', { 
      state: { 
        chatPartnerName: chat.name,
        receiverEmail: chat.email,
        receiverRole: chat.role,
        driverPhone: chat.phone,
        rideId: chat.rideId,
        receiverId: chat.receiverId,
        currentUserId: currentUserId
      } 
    });
  };

  return (
    // Updated this wrapper to flex-grow and overflow safely within your layout
    <div className="flex-grow flex flex-col p-6 pb-24 overflow-y-auto bg-slate-50 animate-fade-in w-full h-full">
      <h1 className="text-3xl font-poppins font-bold text-syncro-dark mb-6">
        Inbox
      </h1>

      <div className="flex flex-col gap-3">
        {loadedChats.length > 0 ? (
          loadedChats.map((chat) => (
            <button 
              key={`${chat.rideId}-${chat.receiverId}`}
              onClick={() => openChat(chat)}
              className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="relative">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                  🧑
                </div>
                {chat.unread && (
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-syncro-green border-2 border-white rounded-full"></span>
                )}
              </div>
              
              <div className="flex-grow overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-syncro-dark truncate">{chat.name}</h3>
                  <span className={`text-xs ${chat.unread ? 'text-syncro-green font-bold' : 'text-gray-400'}`}>
                    {chat.time}
                  </span>
                </div>
                <p className={`text-sm truncate ${chat.unread ? 'font-bold text-gray-800' : 'text-gray-500'}`}>
                  {chat.lastMessage}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className={`text-center mt-12 font-medium ${authError ? 'text-red-500' : 'text-gray-400'}`}>
            {authError || 'No messages yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
