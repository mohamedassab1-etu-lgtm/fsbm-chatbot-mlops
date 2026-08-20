'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Nouvel état pour l'apparition du texte en décalé
  const [isTextVisible, setIsTextVisible] = useState(true);

  const userName = "Mohamed";
  const userFullName = "Mohamed Assab";

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isSidebarOpen) {
      timeout = setTimeout(() => setIsTextVisible(true), 50);
    } else {
      setIsTextVisible(false);
    }
    return () => clearTimeout(timeout);
  }, [isSidebarOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const botMessageId = Date.now() + 1;
    let botMessageInserted = false;

    const ensureBotMessage = (text: string) => {
      if (!botMessageInserted) {
        botMessageInserted = true;
        setMessages(prev => [...prev, { id: botMessageId, text, sender: 'bot' }]);
      } else {
        setMessages(prev =>
          prev.map(m => (m.id === botMessageId ? { ...m, text: m.text + text } : m))
        );
      }
    };

    const replaceBotMessage = (fullText: string) => {
      if (!botMessageInserted) {
        botMessageInserted = true;
        setMessages(prev => [...prev, { id: botMessageId, text: fullText, sender: 'bot' }]);
      } else {
        setMessages(prev =>
          prev.map(m => (m.id === botMessageId ? { ...m, text: fullText } : m))
        );
      }
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage.text }),
      });

      if (!response.ok || !response.body) throw new Error('Network error');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          const line = rawEvent.startsWith('data: ') ? rawEvent.slice(6) : rawEvent;
          if (line.trim()) {
            try {
              const event = JSON.parse(line) as { type: string; text: string };

              if (event.type === 'delta') {
                setIsLoading(false);
                ensureBotMessage(event.text);
              } else if (event.type === 'done') {
                setIsLoading(false);
                replaceBotMessage(event.text);
              } else if (event.type === 'error') {
                setIsLoading(false);
                replaceBotMessage(`Désolé, une erreur est survenue : ${event.text}`);
              }
            } catch {
              // Ignore malformed/partial JSON
            }
          }

          boundary = buffer.indexOf('\n\n');
        }
      }

    } catch (error) {
      replaceBotMessage("Désolé, une erreur de connexion est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#131314] text-[#e3e3e3] font-sans selection:bg-blue-500/30">

      {/* Sidebar - La largeur fermée passe à 64px avec un padding p-3 constant */}
      <aside className={`transition-all duration-300 ease-in-out flex flex-col justify-between z-20 ${isSidebarOpen ? 'bg-[#1e1f20] w-[288px] p-3' : 'bg-transparent w-[52px] p-3'}`}>

        {/* Top Section */}
        <div className="flex flex-col gap-4 w-full">

          {/* Header de la sidebar */}
          <div className="flex items-center h-10 w-full px-1">
            {isSidebarOpen ? (
              <div key="sidebar-open" className="flex items-center justify-between w-full">

                {/* Lien avec logo aligné avec gap-2 */}
                <a href="/" className="flex items-center gap-2 cursor-pointer">
                  <div className="flex items-center justify-center w-7 h-7 shrink-0">
                    <img src="/fsbm-assistant-logo-mini.png" alt="FSBM Logo" className="w-5 h-5 object-contain" />
                  </div>
                  <span className={`text-[14px] font-medium tracking-tight text-[#e3e3e3] whitespace-nowrap transition-opacity duration-300 ${isTextVisible ? 'opacity-100' : 'opacity-0'}`}>
                    FSBM Assistant
                  </span>
                </a>

                {/* Icône de fermeture */}
                <div className="relative flex items-center group/tooltip">
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center justify-center w-10 h-10 hover:bg-[#282a2c] rounded-full transition-colors text-[#c4c7c5] hover:text-[#e3e3e3] cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                      <path d="m16 15-3-3 3-3" className="opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200" />
                    </svg>
                  </button>

                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#e3e3e3] text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                    Close sidebar
                  </div>
                </div>
              </div>
            ) : (
              // Menu fermé
              <div key="sidebar-closed" className="relative flex items-center group/tooltip">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="relative flex items-center justify-center w-10 h-10 hover:bg-[#282a2c] rounded-full transition-colors cursor-pointer group/btn"
                >
                  <img
                    src="/fsbm-assistant-logo-mini.png"
                    alt="FSBM Logo Mini"
                    className="w-5 h-5 object-contain absolute transition-opacity duration-200 group-hover/btn:opacity-0"
                  />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#e3e3e3] absolute opacity-0 transition-opacity duration-200 group-hover/btn:opacity-100">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="15" y1="3" x2="15" y2="21" />
                    <path d="m8 9 3 3-3 3" />
                  </svg>
                </button>

                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#e3e3e3] text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                  Open sidebar
                </div>
              </div>
            )}
          </div>

          {/* Bouton New Chat */}
          <div className="mt-1 px-1">
            <button onClick={() => setMessages([])} className="flex items-center gap-2 w-full rounded-full hover:bg-[#282a2c] transition-colors text-[#c4c7c5] hover:text-[#e3e3e3] cursor-pointer">
              <div className="flex items-center justify-center w-7 h-7 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className={`font-medium text-[13px] whitespace-nowrap transition-opacity duration-300 ${isTextVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                New chat
              </span>
            </button>
          </div>

          {/* Menu Items (Search chats) */}
          <div className="flex flex-col mt-1 px-1">
            <button className="flex items-center gap-2 w-full rounded-full hover:bg-[#282a2c] transition-colors text-[#c4c7c5] hover:text-[#e3e3e3] cursor-pointer">
              <div className="flex items-center justify-center w-7 h-7 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <span className={`text-[13px] whitespace-nowrap transition-opacity duration-300 ${isTextVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                Search chats
              </span>
            </button>
          </div>

          {/* Recents Section */}
          <div className={`mt-4 flex-1 overflow-x-hidden overflow-y-auto transition-opacity duration-300 ${isTextVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <span className="text-[11px] font-medium text-[#8e918f] px-3 mb-1.5 block whitespace-nowrap">Recents</span>

            <div className="flex flex-col px-1">
              <button className="flex items-center justify-between w-full hover:bg-[#282a2c] rounded-full text-[#c4c7c5] hover:text-[#e3e3e3] group transition-colors cursor-pointer">
                <div className="flex items-center gap-2 w-full truncate">
                  <div className="flex items-center justify-center w-7 h-7 shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  </div>
                  <span className="truncate text-[13px] text-left">Building a University Chatbot</span>
                </div>
                <div className="flex items-center justify-center w-7 h-7 shrink-0 cursor-pointer">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#8e918f] hover:text-white transition-colors">
                    <path d="M16 11V5.5A2.5 2.5 0 0 0 13.5 3h-3A2.5 2.5 0 0 0 8 5.5V11l-2 3v2h5v5l1 1 1-1v-5h5v-2l-2-3z" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col w-full mt-auto pt-2">

          <div className="px-1 mb-1">
            <button className="flex items-center gap-2 w-full hover:bg-[#282a2c] rounded-full text-[#c4c7c5] hover:text-[#e3e3e3] transition-colors cursor-pointer">
              <div className="flex items-center justify-center w-7 h-7 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              </div>
              <span className={`text-[13px] whitespace-nowrap transition-opacity duration-300 ${isTextVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                Settings
              </span>
            </button>
          </div>

          {/* Profil utilisateur */}
          <div className="flex items-center gap-2 w-full cursor-pointer hover:bg-[#282a2c] rounded-full transition-colors h-10 px-1">
            <div className="flex items-center justify-center shrink-0">
              <div className="w-[30px] h-[30px] rounded-full bg-blue-600 flex items-center justify-center shrink-0 font-bold text-[12px] text-white overflow-hidden relative">
                <img src="/image_c382a3.png" alt="Profile" className="absolute w-full h-full object-cover opacity-0 hover:opacity-100" />
                {userName.charAt(0)}
              </div>
            </div>
            <div className={`flex flex-col justify-center whitespace-nowrap transition-opacity duration-300 ${isTextVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <span className="text-[15px] font-medium leading-tight text-[#e3e3e3]">{userFullName}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative min-w-0 bg-[#131314]">

        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24">
            <img src="/fsbm-asstistant-logo.png" alt="FSBM Full Logo" className="h-20 sm:h-28 object-contain mb-6 opacity-90" />
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight bg-gradient-to-r from-[#d8d8d8] to-[#6b6b6b] bg-clip-text text-transparent mb-8">
              What can I help with, {userName}?
            </h2>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-40">
            <div className="w-[724px] mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start gap-4'}`}>
                  {msg.sender === 'bot' && (
                    <div className="w-6 h-6 shrink-0 mt-1">
                      <img src="/fsbm-assistant-logo-mini.png" alt="Bot" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className={`max-w-[452px] text-[17px] leading-relaxed py-[20px] px-[28px] rounded-[40px] ${msg.sender === 'user' ? 'bg-[#1e1f20] text-[#e3e3e3]' : 'text-[#e3e3e3]'
                    }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start gap-4">
                  <div className="w-6 h-6 shrink-0 mt-1 animate-pulse opacity-50">
                    <img src="/fsbm-assistant-logo-mini.png" alt="Loading" className="w-full h-full object-contain" />
                  </div>
                  <div className="pt-2.5 flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-[#e3e3e3] rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-[#e3e3e3] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-[#e3e3e3] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Floating Input Area */}
        <div className={`absolute bottom-0 left-0 right-0 pt-10 pb-6 bg-gradient-to-t from-[#131314] via-[#131314] to-transparent transition-all duration-500 ${messages.length === 0 ? 'top-[55%]' : ''}`}>
          <div className="max-w-3xl mx-auto px-4">
            <form onSubmit={sendMessage} className="relative flex items-center w-[660px] h-[64px] max-h-[246px] p-[12px] rounded-[40px] bg-[#1e1f20] hover:bg-[#282a2c] transition-colors border border-transparent focus-within:border-[#333538]">

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask FSBM Assistant"
                className="w-full h-full bg-transparent text-[#e3e3e3] pr-14 focus:outline-none focus:ring-0 placeholder-[#8e918f] text-[17px]"
                disabled={isLoading}
              />

              <div className="absolute right-2 flex items-center gap-0.5">
                {input.trim() ? (
                  <button type="submit" disabled={isLoading} className="p-1.5 text-black bg-[#e3e3e3] rounded-full hover:bg-white transition-colors shadow-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  </button>
                ) : (
                  <button type="button" className="p-1.5 text-[#c4c7c5] hover:text-[#e3e3e3] transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" /></svg>
                  </button>
                )}
              </div>
            </form>
            <div className="text-center mt-2 text-[11px] text-[#8e918f]">
              FSBM Assistant can make mistakes. Check important info.
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}