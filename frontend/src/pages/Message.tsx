import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Send } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAppStore } from '../store/useAppStore';

export default function Message() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAppStore();
  
  // 🧠 1. Pull the exact data we passed from the Trips/Inbox screen
  const { 
    chatPartnerName = "User", 
    receiverEmail = "",
    receiverRole = "",
    driverPhone = "", 
    rideId, 
    receiverId, 
    currentUserId 
  } = location.state || {};

  // Route state is not preserved after a refresh or direct navigation.
  const safeRideId = Number(rideId) || 1;
  const safeCurrentUserId = Number(currentUserId) || 1;
  const safeReceiverId = Number(receiverId) || 2;
  const currentUserName = user?.name || 'You';

  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [authError, setAuthError] = useState("");

  // 🔄 2. Fetch real chat history when the screen loads
  useEffect(() => {
    let isMounted = true;
    let interval: ReturnType<typeof setInterval> | undefined;

    const loadChatHistory = async (): Promise<boolean> => {
      const token = localStorage.getItem('syncrogo_token') || localStorage.getItem('token');
      if (!token) {
        if (isMounted) setAuthError('Please sign in to view this conversation.');
        return false;
      }

      try {
        const response = await apiClient.get(`/chat/history/${safeRideId}`, {
          params: { receiver_id: safeReceiverId },
        });
        
        if (response.status === 200) {
          const data = response.data;
          // Map backend format to our frontend UI format
          const formattedMessages = data.map((msg: any) => {
            const senderId = Number(
              msg.sender_id ?? msg.senderId ??
              (msg.sender === "me" ? safeCurrentUserId : safeReceiverId),
            );

            return {
              id: msg.id,
              senderId,
              isMine: msg.sender === "me" ? true : msg.sender === "them" ? false : undefined,
              text: msg.text ?? msg.content ?? "",
              time: msg.timestamp ?? new Date(msg.created_at ?? Date.now()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            };
          });
          setMessages(formattedMessages);
          if (isMounted) setAuthError('');
          return true;
        } else {
          console.error("Failed to load chat history");
          return false;
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          if (isMounted) setAuthError('Your session has expired. Please sign in again.');
          return false;
        }
        console.error("Error fetching chat history:", error);
        return true;
      }
    };

    const startPolling = async () => {
      const canPoll = await loadChatHistory();
      if (isMounted && canPoll) interval = setInterval(loadChatHistory, 5000);
    };

    void startPolling();
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [safeRideId, safeCurrentUserId, safeReceiverId]);

  // 🚀 3. Send message to the correct FastAPI endpoint
  const handleSend = async () => {
    if (!inputText.trim()) return;
    if (!(localStorage.getItem('syncrogo_token') || localStorage.getItem('token'))) {
      setAuthError('Please sign in before sending a message.');
      return;
    }

    const textToSend = inputText;

    // Instantly update the UI so it feels fast
    const newMessage = {
      id: Date.now(),
      senderId: safeCurrentUserId,
      isMine: true,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
    
    try {
      const response = await apiClient.post('/chat/send', {
          ride_id: safeRideId,
          sender_id: safeCurrentUserId,
          receiver_id: safeReceiverId,
          content: textToSend
      });

      if (response.status !== 201) {
        console.error("Server failed to save the message.");
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        setAuthError('Your session has expired. Please sign in again.');
      }
      console.error("Network error: Could not reach the backend.", error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans fixed inset-0 z-50">
      
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 shadow-sm bg-white z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-full hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="w-10 h-10 bg-blue-50 text-syncro-blue rounded-full flex items-center justify-center font-bold text-lg">
            {chatPartnerName.charAt(0).toUpperCase()}
          </div>
          
          <div>
            <h2 className="font-bold text-gray-800 leading-tight flex items-center gap-2">
              {chatPartnerName}
              {receiverRole && (
                <span className="text-[10px] bg-blue-50 text-syncro-blue px-2 py-0.5 rounded-full capitalize font-semibold">
                  {receiverRole}
                </span>
              )}
            </h2>
            <span className={`text-[11px] font-bold ${receiverEmail ? 'text-gray-400 normal-case tracking-normal' : 'text-syncro-green uppercase tracking-wider'}`}>
              {receiverEmail || 'Online'}
            </span>
          </div>
        </div>
        
        {driverPhone && (
          <a 
            href={`tel:${driverPhone}`} 
            className="w-10 h-10 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Phone size={18} />
          </a>
        )}
      </div>

      {/* ================= CHAT BUBBLES ================= */}
      <div className="flex-grow p-4 overflow-y-auto bg-slate-50 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className={`text-center mt-10 text-sm font-medium ${authError ? 'text-red-500' : 'text-gray-400'}`}>
            {authError || 'No messages yet. Say hi!'}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.isMine ?? Number(msg.senderId) === safeCurrentUserId;
            const senderName = isMe ? currentUserName : chatPartnerName;
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[11px] text-gray-500 mb-1 px-1 font-semibold">
                  {senderName}
                </span>
                <div className={`max-w-[75%] p-3.5 rounded-2xl ${
                  isMe 
                    ? 'bg-syncro-blue text-white rounded-br-sm shadow-md shadow-blue-100' 
                    : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm'
                }`}>
                  <p className="text-[15px] leading-relaxed">{msg.text}</p>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1 font-medium">{msg.time}</span>
              </div>
            );
          })
        )}
      </div>

      {/* ================= INPUT BOX ================= */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message..."
            className="flex-grow bg-slate-50 border border-gray-200 text-[15px] rounded-full px-5 py-3.5 outline-none focus:border-syncro-blue focus:bg-white transition-colors"
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              inputText.trim() 
                ? 'bg-syncro-blue text-white shadow-lg shadow-blue-200' 
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            <Send size={18} className={inputText.trim() ? "ml-1" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}
