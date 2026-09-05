import { useRef, useEffect, useState } from 'react';
import { Message } from '@/hooks/useChat';
import { Waveform } from '@/components/chat/Waveform';

type MessageBubbleProps = {
    status: 'loading' | 'authenticated' | 'unauthenticated';

    msg: Message;
    isLastMessage: boolean;
    isLoading: boolean;

    editingMessageId: string | number | null;
    editValue: string;
    setEditValue: (val: string) => void;
    startEdit: (msg: Message) => void;
    cancelEdit: () => void;
    updateMessage: (id: string | number) => void;
    regeneratingBotId: string | number | null;

    handleCopy: (text: string) => void;
    messageFeedback: Record<string | number, 'like' | 'dislike'>;
    toggleFeedback: (id: string | number, value: 'like' | 'dislike') => void;

    openMoreMenuId: string | number | null;
    setOpenMoreMenuId: (id: string | number | null) => void;
    moreMenuRef: React.RefObject<HTMLDivElement | null>;

    speakingMessageId: string | number | null;
    isGeneratingAudio: string | number | null;
    isSpeechPaused: boolean;
    speechProgress: number;
    waveformLevels: number[];
    audioCacheRef: React.MutableRefObject<Map<string | number, string>>;
    handleListen: (msg: Message) => void;
    setReportingContext: (context: { id: string | number, isStopped: boolean } | null) => void;
    handleRedo: (id: string | number) => void;
    toggleSpeechPause: () => void;
    seekSpeech: (ratio: number) => void;
    closeSpeech: () => void;
};

export function MessageBubble({
    status, msg, isLastMessage, isLoading,
    editingMessageId, editValue, setEditValue, startEdit, cancelEdit, updateMessage, regeneratingBotId,
    handleCopy, messageFeedback, toggleFeedback,
    openMoreMenuId, setOpenMoreMenuId, moreMenuRef,
    speakingMessageId, isGeneratingAudio, isSpeechPaused, speechProgress, waveformLevels, audioCacheRef, handleListen, setReportingContext, handleRedo, toggleSpeechPause, seekSpeech, closeSpeech
}: MessageBubbleProps) {

    const [isTall, setIsTall] = useState(false);
    const [isWide, setIsWide] = useState(false);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);
    const hiddenEditTextRef = useRef<HTMLSpanElement>(null);

    // Détecteur dynamique : vérifie si le message est proche du bas de l'écran visible
    const bubbleRef = useRef<HTMLDivElement>(null);
    const [isNearBottomMenu, setIsNearBottomMenu] = useState(isLastMessage);
    const [isNearBottomTitle, setIsNearBottomTitle] = useState(isLastMessage);

    useEffect(() => {
        if (editTextareaRef.current && hiddenEditTextRef.current) {
            editTextareaRef.current.style.overflow = 'hidden';
            editTextareaRef.current.style.height = '0px';

            const scrollHeight = editTextareaRef.current.scrollHeight;

            editTextareaRef.current.style.height = `${Math.min(scrollHeight, 246)}px`;

            editTextareaRef.current.style.overflow = '';
            const textWidth = hiddenEditTextRef.current.getBoundingClientRect().width;

            setIsTall(scrollHeight > 40);
            setIsWide(textWidth > 470);
        }
    }, [editValue]);

    const handleFormClick = () => {
        editTextareaRef.current?.focus();
    };

    useEffect(() => {
        const el = bubbleRef.current;
        if (!el) return;

        const updatePosition = () => {
            const rect = el.getBoundingClientRect();
            const distanceFromBottom = window.innerHeight - rect.bottom;
            setIsNearBottomMenu(distanceFromBottom < 250);
            setIsNearBottomTitle(distanceFromBottom < 168);
        };

        updatePosition();

        const ro = new ResizeObserver(updatePosition);
        ro.observe(el);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true); // capture: catches scroll on the inner chat container too

        return () => {
            ro.disconnect();
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [msg.text, msg.isStopped, isLastMessage]);

    useEffect(() => {
        if (editingMessageId === msg.id && editTextareaRef.current) {
            const node = editTextareaRef.current;
            node.focus();
            const end = node.value.length;
            node.setSelectionRange(end, end);
        }
    }, [editingMessageId, msg.id]);

    return (
        <div id={`msg-${msg.id}`} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start w-full'}`}>
            {editingMessageId === msg.id ? (
                <div className="w-full max-w-[452px] flex flex-col gap-2">
                    <span ref={hiddenEditTextRef} className="w-[395px] absolute invisible whitespace-pre font-sans text-[17px] leading-relaxed tracking-normal pointer-events-none" aria-hidden="true">
                        {editValue || ' '}
                    </span>
                    <div onClick={handleFormClick} className={`w-full bg-white dark:bg-[#1e1f20] py-[4px] px-[28px] border border-gray-300 dark:border-[#b1b1b1] hover:border-gray-400 dark:hover:border-[#e6e6e6] focus-within:border-blue-500 dark:focus-within:border-[#5e97f6] focus-within:hover:border-blue-500 dark:focus-within:hover:border-[#5e97f6] ${isTall || isWide ? 'rounded-[44px]' : 'rounded-[32px]'}`}>
                        <div className="w-full py-[16px]">
                            <textarea
                                ref={editTextareaRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                rows={1}
                                className="w-full bg-transparent text-gray-900 dark:text-[#e3e3e3] text-[17px] leading-relaxed focus:outline-none focus:ring-0 resize-none [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-[#424446] [&::-webkit-scrollbar-thumb]:rounded-full"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 px-1">
                        <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-4 py-1.5 rounded-full text-[13px] font-medium text-gray-600 dark:text-[#c4c7c5] hover:bg-gray-100 dark:hover:bg-[#282a2c] transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => updateMessage(msg.id)}
                            disabled={!editValue.trim() || editValue.trim() === msg.text}
                            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${!editValue.trim() || editValue.trim() === msg.text
                                ? 'bg-gray-200 dark:bg-[#333538] text-gray-400 dark:text-[#8e918f] cursor-not-allowed'
                                : 'bg-gray-900 dark:bg-[#e3e3e3] text-white dark:text-[#131314] hover:bg-gray-700 dark:hover:bg-white cursor-pointer'
                                }`}
                        >
                            Update
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    ref={bubbleRef}
                    className={`group/message flex flex-col gap-1 ${msg.sender === 'user' ? 'items-end' : 'items-start w-full'}`}
                >
                    <div className={`text-[17px] leading-relaxed ${!msg.text && msg.isStopped ? 'w-full py-2' : 'py-[20px] px-[28px] rounded-[40px]'} ${msg.sender === 'user' ? 'max-w-[452px] bg-gray-100 dark:bg-[#1e1f20] text-gray-900 dark:text-[#e3e3e3]' : 'w-full text-gray-900 dark:text-[#e3e3e3]'}`}>
                        {regeneratingBotId === msg.id ? (
                            <div className="flex flex-col gap-1.5 py-[2px]">
                                <span className="text-[13px] text-gray-500 dark:text-[#8e918f] animate-pulse">Thinking...</span>
                                <div className="flex space-x-1">
                                    <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-[#e3e3e3] rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-[#e3e3e3] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-[#e3e3e3] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col w-full">
                                {msg.text ? (
                                    <>
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                        {msg.isStopped && (
                                            <div className="flex items-center gap-4 mt-3 opacity-80 w-full">
                                                <div className="h-px bg-gray-300 dark:bg-[#424446] flex-1"></div>
                                                <span className="text-[12px] text-gray-500 dark:text-[#8e918f] font-medium whitespace-nowrap">You stopped this response</span>
                                                <div className="h-px bg-gray-300 dark:bg-[#424446] flex-1"></div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    msg.isStopped && (
                                        <div className="flex items-center gap-4 opacity-80 w-full">
                                            <div className="h-px bg-gray-300 dark:bg-[#424446] flex-1"></div>
                                            <span className="text-[12px] text-gray-500 dark:text-[#8e918f] font-medium whitespace-nowrap">You stopped this response</span>
                                            <div className="h-px bg-gray-300 dark:bg-[#424446] flex-1"></div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    {msg.sender === 'user' && (
                        <div className="flex items-center gap-1 opacity-0 group-hover/message:opacity-100 transition-opacity pr-2">
                            <div className="relative flex items-center group/tooltip">
                                <button
                                    type="button"
                                    onClick={() => handleCopy(msg.text)}
                                    className="flex items-center justify-center w-8 h-8 text-gray-500 dark:text-[#c4c7c5] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-200 dark:hover:bg-[#282a2c] rounded-full transition-colors cursor-pointer"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                </button>
                                <div className={`absolute left-1/2 -translate-x-1/2 ${isNearBottomTitle ? 'bottom-full mb-2' : 'top-full mt-2'} px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm`}>
                                    Copy
                                </div>
                            </div>

                            <div className="relative flex items-center group/tooltip">
                                <button
                                    type="button"
                                    onClick={() => startEdit(msg)}
                                    className="flex items-center justify-center w-8 h-8 text-gray-500 dark:text-[#c4c7c5] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-200 dark:hover:bg-[#282a2c] rounded-full transition-colors cursor-pointer"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]">
                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                    </svg>
                                </button>
                                <div className={`absolute left-1/2 -translate-x-1/2 ${isNearBottomTitle ? 'bottom-full mb-2' : 'top-full mt-2'} px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm`}>
                                    Edit prompt
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BARRE D'ACTION NORMALE (Ajout du bouton Redo) */}
                    {msg.sender === 'bot' && !msg.isStopped && msg.id !== regeneratingBotId && !(isLoading && isNearBottomMenu && !regeneratingBotId) && (
                        <div
                            className={`flex items-center gap-1 pl-2 transition-opacity ${(openMoreMenuId === msg.id || speakingMessageId === msg.id || isGeneratingAudio === msg.id) ? 'opacity-100' : 'opacity-0 group-hover/message:opacity-100'
                                }`}
                        >
                            {/* Like & Dislike - ONLY IF AUTHENTICATED */}
                            {status === 'authenticated' && (
                                <>
                                    {/* Like */}
                                    <div className="relative flex items-center group/tooltip">
                                        <button
                                            type="button"
                                            onClick={() => toggleFeedback(msg.id, 'like')}
                                            className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors cursor-pointer ${messageFeedback[msg.id] === 'like'
                                                ? 'text-gray-900 dark:text-[#e3e3e3] bg-gray-200 dark:bg-[#282a2c]'
                                                : 'text-gray-500 dark:text-[#8e918f] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-200 dark:hover:bg-[#282a2c]'
                                                }`}
                                        >
                                            <svg viewBox="0 0 24 24" fill={messageFeedback[msg.id] === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]">
                                                <path d="M7 10v12" />
                                                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                                            </svg>
                                        </button>
                                        <div className={`absolute left-1/2 -translate-x-1/2 ${isNearBottomTitle ? 'bottom-full mb-2' : 'top-full mt-2'} px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm`}>
                                            Good response
                                        </div>
                                    </div>

                                    {/* Dislike */}
                                    <div className="relative flex items-center group/tooltip">
                                        <button
                                            type="button"
                                            onClick={() => toggleFeedback(msg.id, 'dislike')}
                                            className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors cursor-pointer ${messageFeedback[msg.id] === 'dislike'
                                                ? 'text-gray-900 dark:text-[#e3e3e3] bg-gray-200 dark:bg-[#282a2c]'
                                                : 'text-gray-500 dark:text-[#8e918f] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-200 dark:hover:bg-[#282a2c]'
                                                }`}
                                        >
                                            <svg viewBox="0 0 24 24" fill={messageFeedback[msg.id] === 'dislike' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]">
                                                <path d="M17 14V2" />
                                                <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                                            </svg>
                                        </button>
                                        <div className={`absolute left-1/2 -translate-x-1/2 ${isNearBottomTitle ? 'bottom-full mb-2' : 'top-full mt-2'} px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm`}>
                                            Bad response
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Redo (NOUVEAU) */}
                            <div className="relative flex items-center group/tooltip">
                                <button
                                    type="button"
                                    onClick={() => handleRedo(msg.id)}
                                    className="flex items-center justify-center w-8 h-8 text-gray-500 dark:text-[#8e918f] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-200 dark:hover:bg-[#282a2c] rounded-full transition-colors cursor-pointer"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]">
                                        <path d="M21 2v6h-6" /><path d="M21 13a9 9 0 1 1-3-7.7L21 8" />
                                    </svg>
                                </button>
                                <div className={`absolute left-1/2 -translate-x-1/2 ${isNearBottomTitle ? 'bottom-full mb-2' : 'top-full mt-2'} px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm`}>
                                    Redo
                                </div>
                            </div>

                            {/* Copy */}
                            <div className="relative flex items-center group/tooltip">
                                <button
                                    type="button"
                                    onClick={() => handleCopy(msg.text)}
                                    className="flex items-center justify-center w-8 h-8 text-gray-500 dark:text-[#8e918f] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-200 dark:hover:bg-[#282a2c] rounded-full transition-colors cursor-pointer"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                </button>
                                <div className={`absolute left-1/2 -translate-x-1/2 ${isNearBottomTitle ? 'bottom-full mb-2' : 'top-full mt-2'} px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm`}>
                                    Copy response
                                </div>
                            </div>

                            {isGeneratingAudio === msg.id && (
                                <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#282a2c] border border-gray-200 dark:border-[#3c3f41] rounded-full pl-2.5 pr-3 py-1.5 mr-1 animate-in fade-in slide-in-from-left-1 duration-200">
                                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 animate-spin text-blue-500 dark:text-[#8ab4f8] shrink-0" fill="none">
                                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                    <span className="text-[12px] text-gray-700 dark:text-[#c4c7c5] whitespace-nowrap">Génération de la voix…</span>
                                </div>
                            )}

                            {speakingMessageId === msg.id && (
                                <div className="group/audio flex items-center bg-gray-100 dark:bg-[#282a2c] border border-gray-200 dark:border-[#3c3f41] rounded-full pl-1.5 pr-2 py-1 mr-1 animate-in fade-in slide-in-from-left-1 duration-200 transition-all">
                                    <button
                                        type="button"
                                        onClick={toggleSpeechPause}
                                        className="flex items-center justify-center w-7 h-7 text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-200 dark:hover:bg-[#3c3f41] rounded-full transition-colors cursor-pointer shrink-0"
                                        title={isSpeechPaused ? 'Reprendre' : 'Mettre en pause'}
                                    >
                                        {isSpeechPaused ? (
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><polygon points="6 3 20 12 6 21 6 3" /></svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                                        )}
                                    </button>

                                    <Waveform levels={waveformLevels} />

                                    <div className="flex items-center overflow-hidden transition-all duration-300 ease-in-out max-w-0 opacity-0 group-hover/audio:max-w-[180px] group-hover/audio:opacity-100 group-hover/audio:ml-1 group-hover/audio:gap-2">
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={Math.round(speechProgress * 100)}
                                            onChange={(e) => seekSpeech(Number(e.target.value) / 100)}
                                            className="w-20 h-1 accent-blue-500 dark:accent-[#8ab4f8] cursor-pointer shrink-0"
                                            title="Aller à un passage précis"
                                        />

                                        <a
                                            href={audioCacheRef.current.get(msg.id) || '#'}
                                            download={`FSBM_Assistant_Vocal_${msg.id}.mp3`}
                                            className="flex items-center justify-center w-7 h-7 text-gray-500 dark:text-[#8e918f] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-200 dark:hover:bg-[#3c3f41] rounded-full transition-colors cursor-pointer shrink-0"
                                            title="Télécharger l'audio"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                        </a>

                                        <button
                                            type="button"
                                            onClick={closeSpeech}
                                            className="flex items-center justify-center w-7 h-7 text-gray-500 dark:text-[#8e918f] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-200 dark:hover:bg-[#3c3f41] rounded-full transition-colors cursor-pointer shrink-0"
                                            title="Arrêter la lecture"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* More Options */}
                            <div ref={openMoreMenuId === msg.id ? moreMenuRef : undefined} className="relative flex items-center group/tooltip">
                                <button
                                    type="button"
                                    onClick={() => setOpenMoreMenuId(openMoreMenuId === msg.id ? null : msg.id)}
                                    className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors cursor-pointer ${openMoreMenuId === msg.id
                                        ? 'text-gray-900 dark:text-[#e3e3e3] bg-gray-200 dark:bg-[#282a2c]'
                                        : 'text-gray-500 dark:text-[#8e918f] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-200 dark:hover:bg-[#282a2c]'
                                        }`}
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[16px] h-[16px]">
                                        <circle cx="5" cy="12" r="1.5" />
                                        <circle cx="12" cy="12" r="1.5" />
                                        <circle cx="19" cy="12" r="1.5" />
                                    </svg>
                                </button>

                                {openMoreMenuId !== msg.id && (
                                    <div className={`absolute left-1/2 -translate-x-1/2 ${isNearBottomTitle ? 'bottom-full mb-2' : 'top-full mt-2'} px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm`}>
                                        More
                                    </div>
                                )}

                                {openMoreMenuId === msg.id && (
                                    <div className={`absolute left-0 w-44 bg-white dark:bg-[#282a2c] border border-gray-200 dark:border-[#333538] rounded-2xl shadow-lg py-2 z-50 animate-in fade-in duration-150 ${isNearBottomMenu ? 'bottom-full mb-2 slide-in-from-bottom-1' : 'top-full mt-2 slide-in-from-top-1'}`}>
                                        <button
                                            type="button"
                                            onClick={() => { handleListen(msg); setOpenMoreMenuId(null); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#333538] transition-colors cursor-pointer"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px] shrink-0">
                                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                            </svg>
                                            Listen
                                        </button>

                                        {!msg.isReported && status === 'authenticated' && (
                                            <button
                                                type="button"
                                                onClick={() => { setReportingContext({ id: msg.id, isStopped: false }); setOpenMoreMenuId(null); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#333538] transition-colors cursor-pointer"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px] shrink-0">
                                                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                                    <line x1="4" y1="22" x2="4" y2="15" />
                                                </svg>
                                                Report
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {msg.isReported && (
                                <div className="flex items-center gap-1.5 px-2 py-1 ml-1 rounded-md border border-red-500/20 dark:border-[#f28b82]/20 bg-red-500/10 dark:bg-[#f28b82]/10 text-red-600 dark:text-[#f28b82] cursor-default animate-in fade-in duration-300">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0">
                                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                        <line x1="4" y1="22" x2="4" y2="15" />
                                    </svg>
                                    <span className="text-[11px] font-medium tracking-wide">Reported</span>
                                </div>
                            )}

                        </div>
                    )}

                    {/* BARRE D'ACTION POUR MESSAGES ARRÊTÉS (NOUVEAU) */}
                    {msg.sender === 'bot' && msg.isStopped && msg.id !== regeneratingBotId && (
                        <div className="flex items-center gap-1 pl-2 opacity-0 group-hover/message:opacity-100 transition-opacity">

                            {/* Redo */}
                            <div className="relative flex items-center group/tooltip">
                                <button type="button" onClick={() => handleRedo(msg.id)} className="flex items-center justify-center w-8 h-8 text-gray-500 dark:text-[#8e918f] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-200 dark:hover:bg-[#282a2c] rounded-full transition-colors cursor-pointer">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]"><path d="M21 2v6h-6" /><path d="M21 13a9 9 0 1 1-3-7.7L21 8" /></svg>
                                </button>
                                <div className={`absolute left-1/2 -translate-x-1/2 ${isNearBottomTitle ? 'bottom-full mb-2' : 'top-full mt-2'} px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm`}>
                                    Redo
                                </div>
                            </div>

                            {/* Report */}
                            {!msg.isReported && status === 'authenticated' && (
                                <div className="relative flex items-center group/tooltip">
                                    <button type="button" onClick={() => setReportingContext({ id: msg.id, isStopped: true })} className="flex items-center justify-center w-8 h-8 text-gray-500 dark:text-[#8e918f] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-200 dark:hover:bg-[#282a2c] rounded-full transition-colors cursor-pointer">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
                                    </button>
                                    <div className={`absolute left-1/2 -translate-x-1/2 ${isNearBottomTitle ? 'bottom-full mb-2' : 'top-full mt-2'} px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm`}>
                                        Report
                                    </div>
                                </div>
                            )}

                            {/* Reported Badge */}
                            {msg.isReported && (
                                <div className="flex items-center gap-1.5 px-2 py-1 ml-1 rounded-md border border-red-500/20 dark:border-[#f28b82]/20 bg-red-500/10 dark:bg-[#f28b82]/10 text-red-600 dark:text-[#f28b82] cursor-default animate-in fade-in duration-300">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0">
                                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                        <line x1="4" y1="22" x2="4" y2="15" />
                                    </svg>
                                    <span className="text-[11px] font-medium tracking-wide">Reported</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}