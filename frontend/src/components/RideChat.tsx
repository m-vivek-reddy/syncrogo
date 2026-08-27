import React, { useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
}

interface RideChatProps {
  otherPersonName: string;
  onClose: () => void;
}

export const RideChat: React.FC<RideChatProps> = ({ otherPersonName, onClose }) => {
  const [inputText, setInputText] = useState('');

  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Add our new message to the list
    const newMessage: Message = {
      id: Date.now(),
      text: inputText,
      sender: 'me',
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');
  };

  return (
    <div className="max-w-md mx-auto bg-slate-50 h-[500px] flex flex-col rounded-2xl shadow-lg border border-slate-100 overflow-hidden mt-6">

      {/* 🟢 Chat Header */}
      <div className="bg-indigo-600 px-4 py-4 text-white flex items-center shadow-md z-10">
        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors mr-2">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-lg font-bold">{otherPersonName}</h2>
          <p className="text-indigo-200 text-xs font-medium">SyncroGo Chat</p>
        </div>
      </div>

      {/* 💬 Message Area (Scrollable) */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[80%] p-3 rounded-2xl text-sm ${
              msg.sender === 'me'
                ? 'bg-indigo-600 text-white self-end rounded-tr-sm'
                : 'bg-white text-slate-800 border border-slate-200 self-start rounded-tl-sm shadow-sm'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {/* ⌨️ Input Area */}
      <div className="bg-white p-3 border-t border-slate-200">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-100 border-none focus:ring-2 focus:ring-indigo-500 rounded-xl px-4 py-2 outline-none"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

    </div>
  );
};