'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { ConversationSummary } from '@/hooks/useChat';

import { useSidebar } from '@/context/SidebarContext';
import { useTheme } from '@/context/ThemeContext';

type SearchResult = {
    id: string;
    title: string;
    snippet: string;
    updatedAt: string;
};

const HighlightMatch = ({ text, highlight }: { text: string, highlight: string }) => {
    if (!highlight.trim()) return <>{text}</>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <>
            {parts.map((part, index) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <span key={index} className="text-white font-bold">{part}</span>
                ) : (
                    <span key={index}>{part}</span>
                )
            )}
        </>
    );
};

export default function SearchPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { isSidebarOpen, setIsSidebarOpen } = useSidebar();

    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [isTextVisible, setIsTextVisible] = useState(true);
    const [hasMoreConversations, setHasMoreConversations] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const LIMIT = 10;

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(true);

    // Pagination des résultats de recherche
    const [hasMoreResults, setHasMoreResults] = useState(true);
    const [isLoadingMoreResults, setIsLoadingMoreResults] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        }
    }, [status]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetch(`/api/conversations?skip=0&take=${LIMIT}`, { cache: 'no-store' })
                .then(async (res) => {
                    if (!res.ok) throw new Error('Erreur réseau');
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setConversations(data);
                        if (data.length < LIMIT) setHasMoreConversations(false);
                    }
                }).catch(console.error);
        }
    }, [status]);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isSidebarOpen) timeout = setTimeout(() => setIsTextVisible(true), 50);
        else setIsTextVisible(false);
        return () => clearTimeout(timeout);
    }, [isSidebarOpen]);

    // Exécution de la recherche initiale (Debounce)

    const executreSearch = () => {
        if (status !== 'authenticated') return;

        setIsSearching(true);
        setHasMoreResults(true);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        searchTimeoutRef.current = setTimeout(() => {
            fetch(`/api/search?q=${encodeURIComponent(query)}&skip=0&take=${LIMIT}`)
                .then(res => res.json())
                .then(data => {
                    setResults(data);
                    if (data.length < LIMIT) setHasMoreResults(false);
                    setIsSearching(false);
                })
                .catch(console.error);
        }, 300);

        return () => clearTimeout(searchTimeoutRef.current!);
    }

    useEffect(executreSearch, [query, status]);

    const loadMoreConversations = async () => {
        if (isLoadingMore || !hasMoreConversations) return;
        setIsLoadingMore(true);
        try {
            const res = await fetch(`/api/conversations?skip=${conversations.length}&take=${LIMIT}`, { cache: 'no-store' });
            const data = await res.json();
            if (Array.isArray(data)) {
                if (data.length < LIMIT) setHasMoreConversations(false);
                setConversations(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    return [...prev, ...data.filter(c => !existingIds.has(c.id))];
                });
            }
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Chargement des résultats de recherche supplémentaires
    const loadMoreResults = async () => {
        if (isLoadingMoreResults || !hasMoreResults) return;
        setIsLoadingMoreResults(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&skip=${results.length}&take=${LIMIT}`);
            const data = await res.json();
            if (data.length < LIMIT) setHasMoreResults(false);
            setResults(prev => [...prev, ...data]);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingMoreResults(false);
        }
    };

    // Gestion du scroll de la zone de résultats
    const handleResultsScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 50) {
            loadMoreResults();
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    const handleDeleteConversation = async (id: string) => {
        try {
            const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
            if (!res.ok) return;
            setConversations(prev => prev.filter(c => c.id !== id));
            executreSearch();
        } catch (err) {
            console.error(err);
        }
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

    return (
        <div className="flex h-screen bg-white dark:bg-[#131314] text-gray-900 dark:text-[#e3e3e3] font-sans selection:bg-blue-500/30">
            <Sidebar
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                isTextVisible={isTextVisible}
                onNewChat={() => router.push('/chat')}
                status={status}
                userName={userName}
                userFullName={userFullName}
                profilePictureUrl={profilePictureUrl}
                isStudent={isStudent}
                userEmail={user?.email}
                conversations={conversations}
                activeConversationId={null}
                onSelectConversation={(id) => router.push(`/chat/${id}`)}
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

            <main className="flex-1 flex flex-col items-center bg-white dark:bg-[#131314] overflow-hidden">

                {/* En-tête fixe avec la barre de recherche */}
                <div className="w-full max-w-3xl px-4 pt-16 pb-6 shrink-0">
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-[#e3e3e3]">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search chats"
                            className="w-full h-14 bg-gray-100 dark:bg-[#1e1f20] text-gray-900 dark:text-[#e3e3e3] text-[15px] rounded-full pl-12 pr-12 outline-none focus:bg-white dark:focus:bg-[#282a2c] transition-colors shadow-sm"
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="absolute inset-y-0 right-4 flex items-center text-[#c4c7c5] hover:text-[#e3e3e3]"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Zone de résultats scrollable séparée */}
                <div
                    onScroll={handleResultsScroll}
                    className="w-full max-w-3xl flex-1 min-h-0 overflow-y-auto px-4 pb-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#424446] [&::-webkit-scrollbar-thumb]:rounded-full"
                >
                    <div className="flex flex-col gap-2">
                        <span className="text-[14px] font-medium text-[#c4c7c5] mb-2 px-2">
                            {query ? 'Results' : 'Recent'}
                        </span>

                        {isSearching && results.length === 0 ? (
                            <div className="flex justify-center py-8">
                                <svg viewBox="0 0 24 24" className="w-6 h-6 animate-spin text-[#8e918f]" fill="none">
                                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                            </div>
                        ) : results.length === 0 ? (
                            <div className="text-[#8e918f] text-[14px] px-2">
                                {query ? "No conversations found." : "No chats"}
                            </div>
                        ) : (
                            <>
                                {results.map((res) => (
                                    <div
                                        key={res.id}
                                        onClick={() => router.push(`/chat/${res.id}`)}
                                        className="flex items-start justify-between px-4 py-3 rounded-2xl hover:bg-[#1e1f20] cursor-pointer transition-colors group"
                                    >
                                        <div className="flex flex-col flex-1 min-w-0 pr-4">
                                            <span className="text-[15px] font-medium text-[#e3e3e3] truncate">
                                                <HighlightMatch text={res.title} highlight={query} />
                                            </span>
                                            {res.snippet && (
                                                <span className="text-[13px] text-[#8e918f] truncate mt-0.5">
                                                    <HighlightMatch text={res.snippet} highlight={query} />
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[13px] text-[#c4c7c5] whitespace-nowrap shrink-0 pt-0.5">
                                            {formatDate(res.updatedAt)}
                                        </span>
                                    </div>
                                ))}

                                {isLoadingMoreResults && (
                                    <div className="flex justify-center py-4">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 animate-spin text-[#8e918f]" fill="none">
                                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}