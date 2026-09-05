'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useParams } from 'next/navigation';

import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useChat, Message, ConversationSummary } from '@/hooks/useChat';

import { Toast } from '@/components/ui/Toast';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import { Sidebar } from '@/components/layout/Sidebar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { ReportModal } from '@/components/ui/ReportModal';

import { useSidebar } from '@/context/SidebarContext';
import { useTheme } from '@/context/ThemeContext';

export default function ChatPage() {
  const params = useParams();
  const chatId = params?.chatId?.[0] || null;

  const [input, setInput] = useState('');
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(chatId);

  // Pagination des conversations (Sidebar)
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const LIMIT = 10;

  // Pagination des Messages de la conversation courante
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);

  const [messageFeedback, setMessageFeedback] = useState<Record<string | number, 'like' | 'dislike'>>({});
  const [openMoreMenuId, setOpenMoreMenuId] = useState<string | number | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [reportingContext, setReportingContext] = useState<{ id: string | number, isStopped: boolean } | null>(null);

  const { data: session, status } = useSession();
  const user = session?.user;
  const isStudent = user?.email?.endsWith('@etu.univh2c.ma');
  const userFullName = user?.name || undefined;
  const userName = userFullName?.split(' ')[0]?.toUpperCase() || "GUEST";
  const profilePictureUrl = user?.image || undefined;

  const { theme, setTheme } = useTheme();
  const [voice, setVoice] = useState<'female' | 'male'>('male');

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data.voice) setVoice(data.voice);
        }).catch(console.error);
    } else {
      window.history.pushState(null, '', '/chat');
    }
  }, [status]);

  const {
    speakingMessageId,
    isSpeechPaused,
    speechProgress,
    isGeneratingAudio,
    waveformLevels,
    audioCacheRef,
    handleListen,
    toggleSpeechPause,
    closeSpeech,
    seekSpeech
  } = useAudioPlayer({ voicePreference: voice });

  const { isListening, interimTranscript, toggleListening, waveformCanvasRef } = useSpeechRecognition({
    onTranscript: (transcript) => setInput(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + transcript)
  });

  const {
    messages,
    setMessages,
    isLoading,
    regeneratingBotId,
    sendMessage,
    updateMessage,
    handleStop,
    loadMessages,
    markAsReported,
    regenerateMessage
  } = useChat({
    conversationId: activeConversationId,
    status: status,
    onConversationCreated: (conversation) => {
      setActiveConversationId(conversation.id);
      setConversations(prev => [conversation, ...prev]);
      window.history.replaceState(null, '', `/chat/${conversation.id}`);
    },
    onTitleGenerated: (id, newTitle) => {
      setConversations(prev => prev.map(c => 
        c.id === id ? { ...c, title: newTitle } : c
      ));
    },
    onBeforeRegenerate: (botId) => {
      audioCacheRef.current.delete(botId);
      if (speakingMessageId === botId || isGeneratingAudio === botId) {
        closeSpeech();
      }
    },
    onStartTyping: () => {
      shouldAutoScrollRef.current = true;
    },
    existingConversationTitles: conversations.map(c => c.title).filter(Boolean) as string[]
  });

  const [editingMessageId, setEditingMessageId] = useState<string | number | null>(null);
  const [editValue, setEditValue] = useState('');

  const [showCopyToast, setShowCopyToast] = useState(false);
  const copyToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isTextVisible, setIsTextVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // -- Référénces pour le contrôle du Scroll --
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // NOUVEAU : Références pour cibler le dernier message utilisateur et le changement de chat
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(false);

  // -- Chargement initial des conversations (Sidebar) --
  useEffect(() => {
    if (status === 'authenticated') {
      fetch(`/api/conversations?skip=0&take=${LIMIT}`, { cache: 'no-store' })
        .then(async (res) => {
          if (!res.ok) throw new Error('Erreur réseau');
          const text = await res.text();
          if (!text) return [];
          return JSON.parse(text);
        })
        .then(data => {
          if (Array.isArray(data)) {
            setConversations(data);
            if (data.length < LIMIT) setHasMoreConversations(false);
          }
        })
        .catch(err => console.error('Erreur de chargement des conversations :', err));
    }
  }, [status]);

  // Chargement à la volée des conversations pour la Sidebar
  const loadMoreConversations = async () => {
    if (isLoadingMore || !hasMoreConversations) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/conversations?skip=${conversations.length}&take=${LIMIT}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Erreur réseau');
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);

      if (Array.isArray(data)) {
        if (data.length < LIMIT) setHasMoreConversations(false);
        setConversations(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newConvs = data.filter(c => !existingIds.has(c.id));
          return [...prev, ...newConvs];
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // -- Sélection de la conversation --
  const handleSelectConversation = async (id: string) => {
    if (id === activeConversationId && messages.length > 0) return;

    loadMessages([]);
    setActiveConversationId(id);
    setHasMoreMessages(true);

    // NOUVEAU : On indique qu'on vient de changer de chat pour forcer le scroll
    isFirstLoadRef.current = true;

    try {
      const res = await fetch(`/api/conversations/${id}?skip=0&take=10`, { cache: 'no-store' });
      if (!res.ok) {
        // Redirection vers "New Chat" si la conversation n'existe pas ou n'appartient pas à l'utilisateur
        setActiveConversationId(null);
        window.history.replaceState(null, '', '/chat');
        return;
      }
      const conversation = await res.json();

      loadMessages(conversation.messages);
      if (conversation.messages.length < 10) setHasMoreMessages(false);

      const loadedFeedback: Record<string | number, 'like' | 'dislike'> = {};
      conversation.messages.forEach((msg: any) => {
        if (msg.feedback) {
          loadedFeedback[msg.id] = msg.feedback;
        }
      });
      setMessageFeedback(loadedFeedback);

      window.history.pushState(null, '', `/chat/${id}`);
    } catch (err) {
      console.error('Impossible de charger la conversation :', err);
    }
  };

  useEffect(() => {
    if (chatId && status === 'authenticated') {
      handleSelectConversation(chatId);
    }
  }, [chatId, status]);

  // Lazy Loading des anciens messages
  const fetchOlderMessages = async () => {
    if (isLoadingOlderMessages || !hasMoreMessages || !activeConversationId) return;
    setIsLoadingOlderMessages(true);
    try {
      const container = scrollContainerRef.current;
      const previousScrollHeight = container?.scrollHeight || 0;

      const res = await fetch(`/api/conversations/${activeConversationId}?skip=${messages.length}&take=10`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Erreur réseau');
      const data = await res.json();

      if (data.messages.length < 10) setHasMoreMessages(false);

      if (data.messages.length > 0) {
        const loadedFeedback: Record<string | number, 'like' | 'dislike'> = { ...messageFeedback };
        data.messages.forEach((msg: any) => {
          if (msg.feedback) loadedFeedback[msg.id] = msg.feedback;
        });
        setMessageFeedback(loadedFeedback);

        setMessages(prev => [...data.messages, ...prev]);

        setTimeout(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - previousScrollHeight;
          }
        }, 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  const handleNewChat = () => {
    loadMessages([]);
    setActiveConversationId(null);
    setHasMoreMessages(true);
    window.history.pushState(null, '', '/chat');
  };

  const handleTogglePin = async (id: string, currentlyPinned: boolean) => {
    const newPinnedStatus = !currentlyPinned;
    const now = new Date().toISOString();

    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === id ? { ...c, isPinned: newPinnedStatus, pinnedAt: newPinnedStatus ? now : null } : c
      );
      return updated.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        if (a.isPinned && b.isPinned) {
          return new Date(b.pinnedAt || 0).getTime() - new Date(a.pinnedAt || 0).getTime();
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    });

    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: newPinnedStatus })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, title: newTitle } : c
    ));
    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (!res.ok) return;
      setConversations(prev => prev.filter(c => c.id !== id));
      if (id === activeConversationId) {
        setMessages([]);
        setActiveConversationId(null);
        window.history.pushState(null, '', '/chat');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    shouldAutoScrollRef.current = isAtBottom;

    if (scrollTop < 10 && hasMoreMessages && !isLoadingOlderMessages) {
      fetchOlderMessages();
    }
  };

  // NOUVEAU : Logique de Scroll Intelligente
  useEffect(() => {
    if (isFirstLoadRef.current && messages.length > 0) {
      // 1. Si on vient d'ouvrir un chat, on scrolle à la hauteur du dernier message "user"
      if (lastUserMessageRef.current && scrollContainerRef.current) {
        // Le -24px permet de laisser un léger espace en haut pour le confort visuel
        scrollContainerRef.current.scrollTop = lastUserMessageRef.current.offsetTop - 24;
      } else if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
      isFirstLoadRef.current = false;
      shouldAutoScrollRef.current = false; // On désactive l'auto-scroll pour laisser l'utilisateur lire
    } else if (shouldAutoScrollRef.current) {
      // 2. Si on est en train de générer un message ou qu'on est déjà en bas
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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

  useEffect(() => {
    if (openMoreMenuId === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setOpenMoreMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMoreMenuId]);

  useEffect(() => {
    return () => {
      if (copyToastTimeoutRef.current) clearTimeout(copyToastTimeoutRef.current);
    };
  }, []);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      return;
    }
    setShowCopyToast(true);
    if (copyToastTimeoutRef.current) clearTimeout(copyToastTimeoutRef.current);
    copyToastTimeoutRef.current = setTimeout(() => setShowCopyToast(false), 2000);
  };

  const toggleFeedback = (id: string | number, value: 'like' | 'dislike') => {
    setMessageFeedback(prev => {
      const current = prev[id];
      const newFeedback = current === value ? null : value;
      if (activeConversationId && typeof id === 'string') {
        fetch(`/api/conversations/${activeConversationId}/messages/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback: newFeedback })
        }).catch(err => console.error(err));
      }
      if (newFeedback === null) {
        const newObj = { ...prev };
        delete newObj[id];
        return newObj;
      }
      return { ...prev, [id]: newFeedback };
    });
  };

  const startEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditValue(msg.text);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditValue('');
  };

  // NOUVEAU : On calcule l'index du dernier message de l'utilisateur pour y attacher la ref
  const lastUserMsgIndex = messages.reduce((acc, msg, idx) => msg.sender === 'user' ? idx : acc, -1);

  const userMessages = messages
    .filter(m => m.sender === 'user')
    .map(m => m.text)
    .reverse();

  return (
    <div className="flex h-screen bg-white dark:bg-[#131314] text-gray-900 dark:text-[#e3e3e3] font-sans selection:bg-blue-500/30">

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isTextVisible={isTextVisible}
        onNewChat={handleNewChat}
        status={status}
        userName={userName}
        userFullName={userFullName}
        profilePictureUrl={profilePictureUrl}
        isStudent={isStudent}
        userEmail={user?.email}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onTogglePin={handleTogglePin}
        onRenameConversation={handleRenameConversation}
        loadMoreConversations={loadMoreConversations}
        hasMoreConversations={hasMoreConversations}
        isLoadingMore={isLoadingMore}
        theme={theme}
        setTheme={setTheme}
        voice={voice}
        setVoice={setVoice}
      />

      <main className="flex-1 flex flex-col relative min-w-0 bg-white dark:bg-[#131314] overflow-hidden">

        {messages.length === 0 && !isFullscreen ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <WelcomeScreen status={status} userName={userName} />
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            // L'ajout de "relative" assure que le calcul de offsetTop soit exact
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative p-4 sm:p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#424446] [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            <div className="w-[724px] mx-auto flex flex-col">

              {isLoadingOlderMessages && (
                <div className="flex justify-center py-4 shrink-0 transition-opacity duration-300">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 animate-spin text-[#8ab4f8]" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              {messages.map((msg, index) => {
                // NOUVEAU : Vérifie s'il s'agit du dernier message de l'utilisateur
                const isLastUserMsg = index === lastUserMsgIndex;

                return (
                  <div key={msg.id} ref={isLastUserMsg ? lastUserMessageRef : null} className="w-full">
                    <MessageBubble
                      status={status}
                      msg={msg}
                      isLastMessage={index === messages.length - 1}
                      isLoading={isLoading}
                      editingMessageId={editingMessageId}
                      editValue={editValue}
                      setEditValue={setEditValue}
                      startEdit={startEdit}
                      cancelEdit={cancelEdit}
                      updateMessage={(id) => {
                        updateMessage(id, editValue, messages);
                        cancelEdit();
                      }}
                      regeneratingBotId={regeneratingBotId}
                      handleCopy={handleCopy}
                      messageFeedback={messageFeedback}
                      toggleFeedback={toggleFeedback}
                      openMoreMenuId={openMoreMenuId}
                      setOpenMoreMenuId={setOpenMoreMenuId}
                      moreMenuRef={moreMenuRef}
                      speakingMessageId={speakingMessageId}
                      isGeneratingAudio={isGeneratingAudio}
                      isSpeechPaused={isSpeechPaused}
                      speechProgress={speechProgress}
                      waveformLevels={waveformLevels}
                      audioCacheRef={audioCacheRef}
                      handleListen={handleListen}
                      setReportingContext={setReportingContext}
                      handleRedo={(botId) => {
                        regenerateMessage(botId);

                        // On cherche le message utilisateur associé (situé juste avant dans la liste des messages)
                        // Note : Tu peux passer directement la liste de tes messages globaux ici
                        const botIndex = messages.findIndex(m => m.id === botId);
                        if (botIndex > 0) {
                          const userMsgId = messages[botIndex - 1].id;
                          const el = document.getElementById(`msg-${userMsgId}`);
                          if (el && scrollContainerRef.current) {
                            scrollContainerRef.current.scrollTop = el.offsetTop - 24;
                          }
                        }
                      }}
                      toggleSpeechPause={toggleSpeechPause}
                      seekSpeech={seekSpeech}
                      closeSpeech={closeSpeech}
                    />
                  </div>
                );
              })}

              {isLoading && messages.length > 0 && messages[messages.length - 1].sender === 'user' && !regeneratingBotId && (
                <div className="flex justify-start">
                  <div className="flex flex-col gap-1.5 pt-1.5">
                    <span className="text-[13px] text-[#8e918f] animate-pulse">Thinking...</span>
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-[#e3e3e3] rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-[#e3e3e3] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1.5 h-1.5 bg-[#e3e3e3] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="h-6 shrink-0 w-full"></div>
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        <div className={`shrink-0 w-full bg-white dark:bg-[#131314] ${isFullscreen ? 'absolute inset-0 z-50 flex flex-col' : 'pt-2 pb-6'}`}>
          <div className={`max-w-3xl w-full mx-auto px-4 ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
            <ChatInput
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              sendMessage={sendMessage}
              handleStop={handleStop}
              isFullscreen={isFullscreen}
              setIsFullscreen={setIsFullscreen}
              isListening={isListening}
              interimTranscript={interimTranscript}
              toggleListening={toggleListening}
              waveformCanvasRef={waveformCanvasRef}
              userMessages={userMessages}
            />
          </div>
        </div>

      </main>

      <Toast show={showCopyToast} />

      <ReportModal
        isOpen={reportingContext !== null}
        onClose={() => setReportingContext(null)}
        conversationId={activeConversationId}
        messageId={reportingContext?.id || null}
        isStopped={reportingContext?.isStopped || false} // <-- ADDED
        onReportSuccess={markAsReported}
      />

    </div>
  );
}