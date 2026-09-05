import { useState, useRef, useEffect } from "react";
import { signIn, signOut } from "next-auth/react";
import { ConversationSummary } from "@/hooks/useChat";
import { useRouter } from 'next/navigation';

type SidebarProps = {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    isTextVisible: boolean;
    onNewChat: () => void;
    status: 'loading' | 'authenticated' | 'unauthenticated';
    userName: string;
    userFullName?: string;
    profilePictureUrl?: string;
    isStudent?: boolean;
    userEmail?: string | null;
    conversations: ConversationSummary[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onDeleteConversation: (id: string) => void;
    onTogglePin: (id: string, isPinned: boolean) => void;
    onRenameConversation: (id: string, newTitle: string) => void;
    loadMoreConversations: () => void;
    hasMoreConversations: boolean;
    isLoadingMore: boolean;
    theme: 'system' | 'light' | 'dark';
    setTheme: (theme: 'system' | 'light' | 'dark') => void;
    voice: 'female' | 'male';
    setVoice: (voice: 'female' | 'male') => void;
};

export function Sidebar({
    isSidebarOpen,
    setIsSidebarOpen,
    isTextVisible,
    onNewChat,
    status,
    userName,
    userFullName,
    profilePictureUrl,
    isStudent,
    userEmail,
    conversations,
    activeConversationId,
    onSelectConversation,
    onDeleteConversation,
    onTogglePin,
    onRenameConversation,
    loadMoreConversations,
    hasMoreConversations,
    isLoadingMore,
    theme,
    setTheme,
    voice,
    setVoice
}: SidebarProps) {

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [editingConvId, setEditingConvId] = useState<string | null>(null);
    const [editConvName, setEditConvName] = useState("");
    const [renameError, setRenameError] = useState("");
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const router = useRouter();

    const nameRef = useRef<HTMLSpanElement>(null);
    const emailRef = useRef<HTMLSpanElement>(null);
    const [isNameTruncated, setIsNameTruncated] = useState(false);
    const [isEmailTruncated, setIsEmailTruncated] = useState(false);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isSettingsOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setIsSettingsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isSettingsOpen]);

    const updateSetting = async (key: 'theme' | 'voice', value: string) => {
        if (key === 'theme') {
            setTheme(value as any);
        }

        if (key === 'voice') {
            setVoice(value as any);
            if (status === 'authenticated') {
                await fetch('/api/settings', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ voice: value })
                });
            }
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (status === 'authenticated') {
            if (conversations.length > 0) setIsInitialLoad(false);
            const timer = setTimeout(() => setIsInitialLoad(false), 1500);
            return () => clearTimeout(timer);
        } else if (status === 'unauthenticated') {
            setIsInitialLoad(false);
        }
    }, [status, conversations.length]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 20) {
            loadMoreConversations();
        }
    };

    const handleSaveRename = (id: string, originalTitle: string) => {
        const newTitle = editConvName.trim();
        if (newTitle === originalTitle || newTitle === "") {
            setEditingConvId(null);
            return;
        }
        const nameExists = conversations.some(c => c.id !== id && c.title.toLowerCase() === newTitle.toLowerCase());
        if (nameExists) {
            setRenameError("This name already exists");
            return;
        }
        onRenameConversation(id, newTitle);
        setEditingConvId(null);
        setRenameError("");
    };

    return (
        <aside className={`transition-[width] duration-300 ease-in-out flex flex-col h-screen z-30 ${isSidebarOpen ? 'bg-[#f9f9f9] dark:bg-[#1e1f20] w-[288px]' : 'bg-transparent w-[56px]'} py-3 px-3`}>
            <div className="flex flex-col gap-4 w-full shrink-0">
                <div className="flex items-center justify-between w-full h-10">
                    {isSidebarOpen ? (
                        <div key="sidebar-open" className="flex items-center justify-between w-full animate-in fade-in duration-300">
                            <a href="/" className="flex items-center gap-2 cursor-pointer">
                                <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                    <img src="/fsbm-assistant-logo-mini.png" alt="FSBM Logo" className="w-5 h-5 object-contain" />
                                </div>
                                <span className={`text-[14px] font-medium tracking-tight text-gray-900 dark:text-[#e3e3e3] whitespace-nowrap transition-opacity duration-300 ${isTextVisible ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                    FSBM Assistant
                                </span>
                            </a>
                            <div className="relative flex items-center group/tooltip">
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="flex items-center justify-center w-8 h-8 hover:bg-gray-200 dark:hover:bg-[#282a2c] rounded-full transition-colors text-gray-500 dark:text-[#c4c7c5] hover:text-gray-900 dark:hover:text-[#e3e3e3] cursor-pointer"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <line x1="9" y1="3" x2="9" y2="21" />
                                        <path d="m16 15-3-3 3-3" className="opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200" />
                                    </svg>
                                </button>
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                                    Close sidebar
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div key="sidebar-closed" className="relative flex items-center group/tooltip animate-in fade-in duration-300">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="relative flex items-center justify-center w-8 h-8 hover:bg-gray-200 dark:hover:bg-[#282a2c] rounded-full transition-colors cursor-pointer group/btn"
                            >
                                <img
                                    src="/fsbm-assistant-logo-mini.png"
                                    alt="FSBM Logo Mini"
                                    className="w-5 h-5 object-contain absolute transition-opacity duration-200 group-hover/btn:opacity-0"
                                />
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-900 dark:text-[#e3e3e3] absolute opacity-0 transition-opacity duration-200 group-hover/btn:opacity-100">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <line x1="15" y1="3" x2="15" y2="21" />
                                    <path d="m8 9 3 3-3 3" />
                                </svg>
                            </button>
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                                Open sidebar
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-1 relative group/tooltip">
                    <button
                        onClick={() => {
                            if (status === 'authenticated') onNewChat();
                        }}
                        disabled={status !== 'authenticated'}
                        className={`flex items-center h-8 rounded-full transition-[width,background-color,color] duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'w-[264px]' : 'w-8'
                            } ${status !== 'authenticated'
                                ? 'opacity-50 text-gray-400 dark:text-[#8e918f]'
                                : 'hover:bg-gray-200 dark:hover:bg-[#282a2c] text-gray-600 dark:text-[#c4c7c5] hover:text-gray-900 dark:hover:text-[#e3e3e3] cursor-pointer'
                            }`}
                    >
                        <div className="flex items-center justify-center w-8 h-8 shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </div>
                        <span className={`pl-2 font-medium text-[13px] transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                            New chat
                        </span>
                    </button>
                    {!isSidebarOpen && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                            New chat
                        </div>
                    )}
                </div>

                {status === 'authenticated' && (
                    <div className="flex flex-col mt-1 relative group/tooltip">
                        <button
                            onClick={() => router.push('/search')}
                            className={`flex items-center h-8 rounded-full hover:bg-gray-200 dark:hover:bg-[#282a2c] transition-[width,background-color,color] duration-300 overflow-hidden whitespace-nowrap text-gray-600 dark:text-[#c4c7c5] hover:text-gray-900 dark:hover:text-[#e3e3e3] cursor-pointer ${isSidebarOpen ? 'w-[264px]' : 'w-8'}`}
                        >
                            <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </div>
                            <span className={`pl-2 text-[13px] transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                                Search chats
                            </span>
                        </button>
                        {!isSidebarOpen && (
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                                Search chats
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div
                className="mt-4 flex-1 min-h-0 overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-[#424446] [&::-webkit-scrollbar-thumb]:rounded-full"
                onScroll={handleScroll}
            >
                {isSidebarOpen && status === 'authenticated' && (
                    <span className={`text-[11px] font-medium text-gray-500 dark:text-[#8e918f] pl-2 mb-1.5 block whitespace-nowrap transition-opacity duration-300 ${isTextVisible ? 'opacity-100' : 'opacity-0 hidden'}`}>
                        Recents
                    </span>
                )}

                {isInitialLoad && isSidebarOpen && status === 'authenticated' ? (
                    <div className="flex flex-col gap-1 mt-2">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex items-center h-8 w-[264px] px-3 animate-pulse">
                                <div className="h-3 w-4/5 bg-gray-200 dark:bg-[#282a2c] rounded-full"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-0.5">
                        {isSidebarOpen && conversations.length === 0 && (
                            <span className={`text-[13px] text-gray-500 dark:text-[#8e918f] pl-3 mt-1 cursor-default transition-opacity duration-300 ${isTextVisible ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                No recent chats
                            </span>
                        )}

                        {isSidebarOpen && conversations.map((conv, index) => {
                            const isNearBottom = conversations.length > 4 && index >= conversations.length - 3;

                            return editingConvId === conv.id ? (
                                <div key={conv.id} className="flex flex-col bg-gray-100 dark:bg-[#282a2c] rounded-2xl p-2.5 w-[264px] gap-2 cursor-default animate-in fade-in duration-200">
                                    <input
                                        type="text"
                                        value={editConvName}
                                        onChange={(e) => {
                                            setEditConvName(e.target.value);
                                            setRenameError("");
                                        }}
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveRename(conv.id, conv.title);
                                            if (e.key === 'Escape') { setEditingConvId(null); setRenameError(""); }
                                        }}
                                        className="w-full bg-white dark:bg-[#131314] text-gray-900 dark:text-[#e3e3e3] text-[13px] rounded-lg border border-gray-300 dark:border-[#5e97f6] focus:outline-none px-2.5 py-1.5"
                                    />
                                    {renameError && <span className="text-[11px] text-red-500 dark:text-[#f28b82] px-1 font-medium">{renameError}</span>}
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingConvId(null); setRenameError(""); }}
                                            className="px-3 py-1 rounded-full text-[11px] font-medium text-gray-600 dark:text-[#c4c7c5] hover:bg-gray-200 dark:hover:bg-[#333538] transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSaveRename(conv.id, conv.title); }}
                                            disabled={editConvName.trim() === conv.title || editConvName.trim() === ""}
                                            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${editConvName.trim() === conv.title || editConvName.trim() === "" ? 'bg-gray-200 dark:bg-[#333538] text-gray-400 dark:text-[#8e918f] cursor-not-allowed' : 'bg-blue-600 dark:bg-[#e3e3e3] text-white dark:text-[#131314] hover:bg-blue-700 dark:hover:bg-white cursor-pointer'}`}
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    key={conv.id}
                                    onClick={() => onSelectConversation(conv.id)}
                                    className={`flex items-center h-8 rounded-full group transition-[background-color,color] duration-300 cursor-pointer w-[254px] ${conv.id === activeConversationId
                                        ? 'bg-gray-200 dark:bg-[#171717] hover:bg-gray-300 dark:hover:bg-[#282a2c] text-gray-900 dark:text-[#e3e3e3]'
                                        : 'text-gray-600 dark:text-[#c4c7c5] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-200 dark:hover:bg-[#282a2c]'
                                        }`}
                                >
                                    <div className={`flex-1 flex items-center justify-between pl-3 pr-1 min-w-0 transition-opacity duration-300 ${isTextVisible ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                        <span className="truncate text-[13px] text-left">{conv.title}</span>

                                        <div
                                            className="relative flex items-center justify-center shrink-0 w-7 h-7"
                                            ref={openMenuId === conv.id ? menuRef : null}
                                        >
                                            {conv.isPinned && openMenuId !== conv.id && (
                                                <div className="absolute inset-0 flex items-center justify-center text-gray-900 dark:text-[#e3e3e3] group-hover:opacity-0 transition-opacity pointer-events-none">
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[14px] h-[14px]">
                                                        <path d="M17 11V5V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1v6L5 14v2h6v5l1 1 1-1v-5h6v-2l-2-3z" />
                                                    </svg>
                                                </div>
                                            )}

                                            <div
                                                role="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === conv.id ? null : conv.id);
                                                }}
                                                className={`flex items-center justify-center w-6 h-6 rounded-full cursor-pointer transition-colors ${openMenuId === conv.id
                                                    ? 'text-gray-900 dark:text-[#e3e3e3] bg-gray-300 dark:bg-[#333538] opacity-100'
                                                    : `text-gray-400 dark:text-[#8e918f] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-300 dark:hover:bg-[#333538] opacity-0 group-hover:opacity-100`
                                                    }`}
                                            >
                                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-[13px] h-[13px]">
                                                    <circle cx="12" cy="5" r="1.5" />
                                                    <circle cx="12" cy="12" r="1.5" />
                                                    <circle cx="12" cy="19" r="1.5" />
                                                </svg>
                                            </div>

                                            {openMenuId === conv.id && (
                                                <div
                                                    className={`absolute right-0 ${isNearBottom ? 'bottom-full mb-2' : 'top-full mt-2'} w-[150px] bg-white dark:bg-[#282a2c] border border-gray-200 dark:border-[#333538] rounded-xl shadow-2xl py-1.5 z-[100] cursor-default flex flex-col`}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            onTogglePin(conv.id, !!conv.isPinned);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#333538] transition-colors cursor-pointer text-left"
                                                    >
                                                        {conv.isPinned ? (
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                                                                <line x1="3" y1="3" x2="21" y2="21" /><path d="M15 9V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5" /><path d="M9 14v1l-4 2v2h6v5l1 1 1-1v-5h1" />
                                                            </svg>
                                                        ) : (
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                                                                <line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.67V6h1V4H8v2h1v4.67a2 2 0 0 1-1.11 1.88l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
                                                            </svg>
                                                        )}
                                                        <span>{conv.isPinned ? "Unpin" : "Pin"}</span>
                                                    </button>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            setEditingConvId(conv.id);
                                                            setEditConvName(conv.title);
                                                            setRenameError("");
                                                        }}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#333538] transition-colors cursor-pointer text-left"
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                                                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                                        </svg>
                                                        <span>Rename</span>
                                                    </button>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            onDeleteConversation(conv.id);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-red-600 dark:text-[#f28b82] hover:bg-red-50 dark:hover:bg-[#333538] transition-colors cursor-pointer text-left"
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        </svg>
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {isLoadingMore && isSidebarOpen && (
                            <div className="flex items-center justify-center py-2 h-8 w-[264px] animate-pulse">
                                <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-[#8e918f] rounded-full mx-0.5"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-[#8e918f] rounded-full mx-0.5 animation-delay-200"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-[#8e918f] rounded-full mx-0.5 animation-delay-400"></div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-col w-full shrink-0 pt-2 border-t border-gray-200 dark:border-[#3c3f41] mt-auto">
                <div className="mb-1 relative group/tooltip" ref={settingsRef}>
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className={`flex items-center h-8 hover:bg-gray-200 dark:hover:bg-[#282a2c] rounded-full transition-[width,background-color,color] duration-300 overflow-hidden whitespace-nowrap text-gray-600 dark:text-[#c4c7c5] hover:text-gray-900 dark:hover:text-[#e3e3e3] cursor-pointer ${isSidebarOpen ? 'w-[264px]' : 'w-8'}`}
                    >
                        <div className="flex items-center justify-center w-8 h-8 shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                        </div>
                        <span className={`pl-2 text-[13px] transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                            Settings
                        </span>
                    </button>

                    {!isSidebarOpen && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                            Settings
                        </div>
                    )}

                    {isSettingsOpen && (
                        <div className="absolute bottom-full left-12 mb-2 w-[240px] bg-white dark:bg-[#282a2c] border border-gray-200 dark:border-[#333538] rounded-2xl shadow-2xl py-3 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200 cursor-default">
                            <div className="px-4 pb-2 mb-2 border-b border-gray-200 dark:border-[#3c3f41]">
                                <h3 className="text-[14px] font-medium text-gray-900 dark:text-[#e3e3e3]">Settings</h3>
                            </div>

                            <div className="px-4 py-2">
                                <span className="text-[11px] font-medium text-gray-500 dark:text-[#8e918f] uppercase tracking-wider">Theme</span>
                                <div className="flex items-center gap-1 mt-2 bg-gray-50 dark:bg-[#131314] p-1 rounded-lg border border-gray-200 dark:border-[#3c3f41]">
                                    {['system', 'light', 'dark'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={(e) => { e.stopPropagation(); updateSetting('theme', t); }}
                                            className={`flex-1 flex justify-center py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer capitalize ${theme === t ? 'bg-white dark:bg-[#333538] text-gray-900 dark:text-[#e3e3e3] shadow-sm' : 'text-gray-500 dark:text-[#8e918f] hover:text-gray-900 dark:hover:text-[#c4c7c5]'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="px-4 py-2">
                                <span className="text-[11px] font-medium text-gray-500 dark:text-[#8e918f] uppercase tracking-wider">Reading Voice</span>
                                <div className="flex items-center gap-1 mt-2 bg-gray-50 dark:bg-[#131314] p-1 rounded-lg border border-gray-200 dark:border-[#3c3f41]">
                                    {['female', 'male'].map((v) => (
                                        <button
                                            key={v}
                                            onClick={(e) => { e.stopPropagation(); updateSetting('voice', v); }}
                                            className={`flex-1 flex justify-center py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer capitalize ${voice === v ? 'bg-white dark:bg-[#333538] text-gray-900 dark:text-[#e3e3e3] shadow-sm' : 'text-gray-500 dark:text-[#8e918f] hover:text-gray-900 dark:hover:text-[#c4c7c5]'}`}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className={`transition-all duration-300 ease-out ${status === 'loading' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    {status !== 'authenticated' ? (
                        <button
                            onClick={() => signIn('google')}
                            className={`flex items-center bg-white dark:bg-[#282a2c] hover:bg-gray-50 dark:hover:bg-[#333538] text-gray-700 dark:text-[#e3e3e3] transition-[width,background-color,height] duration-300 border border-gray-300 dark:border-[#3c3f41] hover:border-gray-400 dark:hover:border-[#4f5255] cursor-pointer shadow-sm overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'w-[264px] h-10 rounded-full' : 'w-8 h-8 rounded-full border-transparent'
                                }`}
                        >
                            <div className="flex items-center justify-center shrink-0 w-8 h-8">
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                            </div>
                            <span className={`text-[13px] font-medium transition-opacity duration-300 pl-2 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                                Sign in
                            </span>
                        </button>
                    ) : (
                        <div className={`flex items-center hover:bg-gray-200 dark:hover:bg-[#282a2c] transition-[width,background-color,height] duration-300 group/profile ${isSidebarOpen ? 'w-[264px] rounded-2xl h-[50px] pr-2' : 'w-8 h-8 rounded-full'
                            }`}>

                            <div className="relative flex items-center justify-center w-8 h-8 shrink-0 mt-0.5">
                                <div className={`relative w-8 h-8 rounded-full bg-gradient-to-br from-[#1a73e8] to-[#1557b0] flex items-center justify-center font-semibold text-[13px] text-white shadow-inner overflow-hidden transition-all ${isStudent
                                    ? 'ring-[2px] ring-[#0e355c] ring-offset-[1px] ring-offset-[#f9f9f9] dark:ring-offset-[#1e1f20] group-hover/profile:ring-offset-gray-200 dark:group-hover/profile:ring-offset-[#282a2c]'
                                    : 'border border-gray-200 dark:border-[#3c3f41]'
                                    }`}>
                                    {profilePictureUrl ? (
                                        <img
                                            src={profilePictureUrl}
                                            alt={userFullName || "User"}
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                    ) : userName.charAt(0)}
                                </div>

                                {isStudent && (
                                    <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-[16px] h-[16px] rounded-full border-[1.5px] border-[#f9f9f9] dark:border-[#282a2c] bg-[#0e355c] text-white" title="FSBM Student">
                                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                            <path d="M6 12v5c3 3 9 3 12 0v-5" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            <div className={`flex flex-col justify-center min-w-0 transition-all duration-300 whitespace-nowrap ${isSidebarOpen ? 'w-[160px] opacity-100 pl-2' : 'w-0 opacity-0 pl-0'}`}>

                                <div
                                    className="relative group/name min-w-0"
                                    onMouseEnter={() => {
                                        if (nameRef.current) {
                                            setIsNameTruncated(nameRef.current.scrollWidth > nameRef.current.clientWidth + 0.01);
                                        }
                                    }}
                                >
                                    <span ref={nameRef} className="block text-[13.5px] font-medium leading-tight text-gray-900 dark:text-[#e3e3e3] truncate cursor-default">
                                        {userFullName}
                                    </span>
                                    {isNameTruncated && (
                                        <div className="absolute left-0 bottom-full mb-1.5 px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/name:opacity-100 delay-0 group-hover/name:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                                            {userFullName}
                                        </div>
                                    )}
                                </div>

                                <div
                                    className="relative group/email min-w-0 mt-0.5"
                                    onMouseEnter={() => {
                                        if (emailRef.current) {
                                            setIsEmailTruncated(emailRef.current.scrollWidth > emailRef.current.clientWidth + 0.01);
                                        }
                                    }}
                                >
                                    {isStudent ? (
                                        <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-[#8e918f] font-normal cursor-default min-w-0">
                                            <span ref={emailRef} className="truncate">{userEmail}</span>
                                        </span>
                                    ) : (
                                        <span ref={emailRef} className="block text-[11px] text-gray-500 dark:text-[#8e918f] truncate font-normal cursor-default">
                                            {userEmail}
                                        </span>
                                    )}
                                    {isEmailTruncated && (
                                        <div className="absolute left-0 bottom-full mt-1.5 px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/email:opacity-100 delay-0 group-hover/email:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                                            {userEmail}
                                        </div>
                                    )}
                                </div>

                            </div>

                            <div className={`flex items-center shrink-0 ml-auto group/tooltip relative transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'}`}>
                                <button
                                    onClick={() => signOut()}
                                    className="p-1.5 text-gray-500 dark:text-[#8e918f] hover:text-red-500 dark:hover:text-[#f28b82] hover:bg-red-50 dark:hover:bg-[#382b2b] rounded-full transition-colors opacity-0 group-hover/profile:opacity-100 cursor-pointer"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                </button>
                                <div className="absolute right-0 bottom-full mb-1.5 px-2.5 py-1 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[11px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                                    Sign out
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}