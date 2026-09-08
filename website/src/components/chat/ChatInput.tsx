import { useState, useRef, useEffect } from 'react';

type ChatInputProps = {
    input: string;
    setInput: (val: string) => void;
    isLoading: boolean;
    sendMessage: (text: string) => void;
    handleStop: () => void;
    isFullscreen: boolean;
    setIsFullscreen: (val: boolean) => void;
    isListening: boolean;
    interimTranscript: string;
    toggleListening: () => void;
    waveformCanvasRef: React.RefObject<HTMLCanvasElement | null>;
    userMessages: string[];
};

export function ChatInput({
    input, setInput, isLoading, sendMessage, handleStop,
    isFullscreen, setIsFullscreen,
    isListening, interimTranscript, toggleListening, waveformCanvasRef,
    userMessages
}: ChatInputProps) {

    const [isTall, setIsTall] = useState(false);
    const [isWide, setIsWide] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const hiddenTextRef = useRef<HTMLSpanElement>(null);

    const [historyIndex, setHistoryIndex] = useState<number>(-1);

    useEffect(() => {
        if (textareaRef.current && hiddenTextRef.current) {
            textareaRef.current.style.overflow = 'hidden';
            textareaRef.current.style.height = '0px';

            const scrollHeight = textareaRef.current.scrollHeight;

            if (isFullscreen) {
                textareaRef.current.style.height = 'auto';
            } else {
                textareaRef.current.style.height = `${Math.min(scrollHeight, 246)}px`;
            }

            textareaRef.current.style.overflow = '';
            const textWidth = hiddenTextRef.current.getBoundingClientRect().width;

            setIsTall(scrollHeight > 40);
            setIsWide(textWidth > 470);
        }
    }, [input, isFullscreen]);

    useEffect(() => {
        if (input) setHistoryIndex(-1);
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'ArrowUp') {
            if (!input || historyIndex !== -1) {
                e.preventDefault();
                if (userMessages.length > 0) {
                    setHistoryIndex(prev => Math.min(prev + 1, userMessages.length - 1));
                }
            }
        } else if (e.key === 'ArrowDown') {
            if (historyIndex !== -1) {
                e.preventDefault();
                setHistoryIndex(prev => prev - 1);
            }
        } else if (e.key === 'Tab') {
            if (historyIndex !== -1 && !input) {
                e.preventDefault();
                setInput(userMessages[historyIndex]);
                setHistoryIndex(-1);
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim()) {
                const currentInput = input;
                setInput('');
                setHistoryIndex(-1);
                sendMessage(currentInput);
            }
        } else {
            if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt') {
                setHistoryIndex(-1);
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            const currentInput = input;
            setInput('');
            setHistoryIndex(-1);
            sendMessage(currentInput);
        }
    };

    const cancelSelection = () => {
        setHistoryIndex(-1);
    };

    const handleFormClick = () => {
        textareaRef.current?.focus();
        cancelSelection();
    };

    return (
        <>
            <form onSubmit={handleSubmit} onClick={handleFormClick} className={`relative flex flex-col w-[660px] mx-auto bg-gray-100 dark:bg-[#1e1f20] hover:bg-gray-200 dark:hover:bg-[#282a2c] transition-colors border border-transparent focus-within:border-gray-300 dark:focus-within:border-[#333538] shadow-sm ${isFullscreen ? 'flex-1 rounded-[24px] p-3 pb-14' : (isTall || isWide) ? 'min-h-[64px] rounded-[24px] p-3 pb-14' : 'min-h-[64px] rounded-[32px] p-3 justify-center'}`}>

                {isListening && (
                    <div className="absolute -top-[60px] left-1/2 -translate-x-1/2 w-max max-w-[90%] flex items-center gap-3 bg-white dark:bg-[#1e1f20] border border-gray-200 dark:border-[#333538] rounded-full pl-3 pr-4 py-2 shadow-lg z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                        <canvas ref={waveformCanvasRef as React.RefObject<HTMLCanvasElement>} width={100} height={24} className="shrink-0" />
                        <span className="text-[13px] text-gray-700 dark:text-[#c4c7c5] truncate max-w-[260px]">
                            {interimTranscript || "Je t'écoute..."}
                        </span>
                    </div>
                )}

                {(isTall || isFullscreen) && (
                    <div className="absolute top-3 right-3 z-10 group/tooltip">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setIsFullscreen(!isFullscreen); }}
                            className="flex items-center justify-center w-8 h-8 text-gray-500 dark:text-[#c4c7c5] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-300 dark:hover:bg-[#333538] rounded-full transition-colors cursor-pointer"
                        >
                            {isFullscreen ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><polyline points="15 3 21 3 21 9" /><line x1="21" y1="3" x2="14" y2="10" /><polyline points="9 21 3 21 3 15" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                            )}
                        </button>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                            {isFullscreen ? 'Collapse' : 'Fullscreen'}
                        </div>
                    </div>
                )}

                <span ref={hiddenTextRef} className="absolute invisible whitespace-pre font-sans text-[16px] leading-relaxed tracking-normal pointer-events-none" aria-hidden="true">
                    {input || ' '}
                </span>

                {historyIndex !== -1 && !input && (
                    <div className={`absolute left-[20px] right-[90px] flex items-center pointer-events-none z-0 ${isFullscreen ? 'top-[12px]' : 'inset-y-0'}`}>
                        <span className="text-gray-400 dark:text-[#8e918f] text-[16px] truncate flex-1">
                            {userMessages[historyIndex]}
                        </span>
                        <div className="flex items-center ml-3 bg-gray-300 dark:bg-[#333538] px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-700 dark:text-[#e3e3e3] uppercase tracking-wide shrink-0 shadow-sm border border-gray-400 dark:border-[#424446]">
                            Tab
                        </div>
                    </div>
                )}

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={cancelSelection}
                    onClick={(e) => { e.stopPropagation(); cancelSelection(); }}
                    placeholder={historyIndex !== -1 ? '' : 'Ask FSBM ChatBot'}
                    rows={1}
                    className={`w-full bg-transparent text-gray-900 dark:text-[#e3e3e3] placeholder-gray-500 dark:placeholder-[#8e918f] text-[16px] resize-none focus:outline-none focus:ring-0 pl-2 pr-[56px] leading-relaxed overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-[#424446] [&::-webkit-scrollbar-thumb]:rounded-full z-10 ${isFullscreen ? 'flex-1' : ''}`}
                    style={{ maxHeight: isFullscreen ? 'none' : '246px' }}
                    disabled={isLoading}
                />

                <div className={`absolute right-3 flex items-center gap-1.5 transition-all z-10 ${isTall || isWide || isFullscreen ? 'bottom-3' : 'top-1/2 -translate-y-1/2'}`}>
                    <div className="relative flex items-center group/tooltip">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleListening(); cancelSelection(); }}
                            className={`flex items-center justify-center w-8 h-8 transition-colors rounded-full cursor-pointer shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 dark:text-[#c4c7c5] hover:text-gray-900 dark:hover:text-[#e3e3e3] hover:bg-gray-300 dark:hover:bg-[#333538]'}`}
                        >
                            {isListening ? (
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-[14px] h-[14px]"><rect x="6" y="6" width="12" height="12" rx="2" ry="2" /></svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
                            )}
                        </button>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                            {isListening ? 'Stop listening' : 'Speak'}
                        </div>
                    </div>

                    {(input.trim() || isLoading) && (
                        <div className="relative flex items-center group/tooltip animate-in fade-in zoom-in-95 duration-200">
                            {isLoading ? (
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleStop(); }} className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 dark:bg-[#e3e3e3] text-white dark:text-[#131314] hover:bg-gray-700 dark:hover:bg-white transition-colors shadow-sm cursor-pointer">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[16px] h-[16px]"><rect x="5" y="5" width="14" height="14" rx="2" ry="2" /></svg>
                                </button>
                            ) : (
                                <button type="submit" disabled={isLoading} className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 dark:bg-[#e3e3e3] text-white dark:text-[#131314] hover:bg-gray-700 dark:hover:bg-white transition-colors shadow-sm cursor-pointer">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
                                </button>
                            )}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-800 dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                                {isLoading ? 'Stop' : 'Submit'}
                            </div>
                        </div>
                    )}
                </div>
            </form>
            <div className="text-center mt-2 text-[11px] text-gray-500 dark:text-[#8e918f]">
                FSBM Assistant can make mistakes. Check important info.
            </div>
        </>
    );
}