import { useState, useRef, useCallback } from 'react';

export type Message = {
    id: string | number;
    text: string;
    sender: 'user' | 'bot';
    isStopped?: boolean;
    feedback?: 'like' | 'dislike' | null;
    isReported?: boolean;
};

export type ConversationSummary = {
    id: string;
    title: string;
    updatedAt: string;
    isPinned?: boolean;
    pinnedAt?: string | null;
};

type UseChatProps = {
    conversationId: string | null;
    status?: 'loading' | 'authenticated' | 'unauthenticated';
    onConversationCreated?: (conversation: ConversationSummary) => void;
    onBeforeRegenerate?: (botId: string | number) => void;
    onStartTyping?: () => void;
    onTitleGenerated?: (id: string, title: string) => void;
    existingConversationTitles?: string[];
};

export function useChat({ conversationId, status = 'unauthenticated', onConversationCreated, onBeforeRegenerate, onStartTyping, onTitleGenerated, existingConversationTitles = [] }: UseChatProps = { conversationId: null }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [regeneratingBotId, setRegeneratingBotId] = useState<string | number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchIdRef = useRef<number>(0);
    const convIdRef = useRef<string | null>(conversationId);
    convIdRef.current = conversationId;

    const loadMessages = useCallback((history: Message[]) => {
        fetchIdRef.current += 1;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setMessages(history);
        setIsLoading(false);
        setRegeneratingBotId(null);
    }, []);

    const handleStop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    const markAsReported = useCallback((id: string | number) => {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, isReported: true } : m));
    }, []);

    const normalizeTitle = (title: string) =>
        title.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

    const generateUniqueTitle = async (
        prompt: string,
        existingTitles: string[]
    ) => {
        let language: string | undefined = undefined;
        let exceptionTitles: string[] = [];

        const maxAttempts = 5;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {

            const body: {
                prompt: string;
                language?: string;
                exception_titles?: string[];
            } = {
                prompt
            };

            // Reuse language after the first request
            if (language) {
                body.language = language;
            }

            // Only send exceptions when we actually have duplicates
            if (exceptionTitles.length > 0) {
                body.exception_titles = exceptionTitles;
            }

            const response = await fetch('/api/generate-title', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error('Failed to generate title');
            }

            const data = await response.json();

            if (data.language) {
                language = data.language;
            }

            const generatedTitle = data.title?.trim();

            if (!generatedTitle) {
                throw new Error('Empty title generated');
            }

            const normalizedGenerated = normalizeTitle(generatedTitle);

            const isDuplicate = existingTitles.some(
                existingTitle =>
                    normalizeTitle(existingTitle) === normalizedGenerated
            );

            if (!isDuplicate) {
                return {
                    title: generatedTitle,
                    language
                };
            }

            // Duplicate -> make it an exception for the next attempt
            if (!exceptionTitles.some(
                title => normalizeTitle(title) === normalizedGenerated
            )) {
                exceptionTitles.push(generatedTitle);
            }

            console.log(
                `[Title] Duplicate detected: "${generatedTitle}". Retrying...`
            );
        }

        throw new Error('Unable to generate a unique title');
    };

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;
        if (onStartTyping) onStartTyping();

        fetchIdRef.current += 1;
        const currentFetchId = fetchIdRef.current;

        const userMessage: Message = { id: Date.now(), text, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        const botMessageId = Date.now() + 1;

        const ensureBotMessage = (chunk: string) => {
            if (fetchIdRef.current !== currentFetchId) return;
            setMessages(prev => {
                const exists = prev.some(m => m.id === botMessageId);
                if (!exists) return [...prev, { id: botMessageId, text: chunk, sender: 'bot' }];
                return prev.map(m => (m.id === botMessageId ? { ...m, text: m.text + chunk } : m));
            });
        };

        const replaceBotMessage = (fullText: string) => {
            if (fetchIdRef.current !== currentFetchId) return;
            setMessages(prev => {
                const exists = prev.some(m => m.id === botMessageId);
                if (!exists) return [...prev, { id: botMessageId, text: fullText, sender: 'bot' }];
                return prev.map(m => (m.id === botMessageId ? { ...m, text: fullText } : m));
            });
        };

        let currentConvId = convIdRef.current;
        let finalBotText = '';

        try {
            if (status === 'authenticated' && !currentConvId) {
                const convRes = await fetch('/api/conversations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: "New Chat..." })
                });
                if (convRes.ok) {
                    const newConv = await convRes.json();
                    currentConvId = newConv.id;
                    convIdRef.current = currentConvId;

                    if (onConversationCreated && fetchIdRef.current === currentFetchId) {
                        onConversationCreated(newConv);
                    }

                    // 2. Fire the LLM title generation in the background
                    // Generate a unique conversation title in the background
                    generateUniqueTitle(
                        text,
                        existingConversationTitles
                    )
                        .then(({ title, language }) => {

                            if (!title || !currentConvId) {
                                return;
                            }

                            console.log(
                                `[Title] Final title: "${title}" | Language: ${language}`
                            );

                            // Update database
                            fetch(`/api/conversations/${currentConvId}`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    title
                                })
                            }).catch(console.error);

                            // Update UI
                            if (onTitleGenerated) {
                                onTitleGenerated(currentConvId, title);
                            }
                        })
                        .catch(console.error);
                }
            }

            if (status === 'authenticated' && currentConvId && fetchIdRef.current === currentFetchId) {
                // RÉPARATION : On récupère le vrai ID du message utilisateur depuis MySQL
                fetch(`/api/conversations/${currentConvId}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sender: 'user', text })
                })
                    .then(res => res.json())
                    .then(dbMsg => {
                        if (dbMsg?.id) {
                            setMessages(prev => prev.map(m => m.id === userMessage.id ? { ...m, id: dbMsg.id } : m));
                        }
                    }).catch(console.error);
            }

            if (fetchIdRef.current !== currentFetchId) return;

            abortControllerRef.current = new AbortController();

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: text }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok || !response.body) throw new Error('Network error');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let isInterrupted = false;

            while (true) {
                if (fetchIdRef.current !== currentFetchId) {
                    reader.cancel();
                    isInterrupted = true;
                    break;
                }
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
                                ensureBotMessage(event.text);
                                finalBotText += event.text;
                            } else if (event.type === 'done') {
                                replaceBotMessage(event.text);
                                finalBotText = event.text;
                            } else if (event.type === 'error') {
                                replaceBotMessage(`Désolé, une erreur est survenue : ${event.text}`);
                                finalBotText = `Désolé, une erreur est survenue : ${event.text}`;
                            }
                        } catch { }
                    }
                    boundary = buffer.indexOf('\n\n');
                }
            }

            // RÉPARATION : On récupère le vrai ID du message bot depuis MySQL
            if (status === 'authenticated' && currentConvId && finalBotText) {
                const payload = { sender: 'bot', text: finalBotText, isStopped: false };
                if (isInterrupted || fetchIdRef.current !== currentFetchId) {
                    payload.isStopped = true;
                }

                fetch(`/api/conversations/${currentConvId}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                    .then(res => res.json())
                    .then(dbMsg => {
                        if (dbMsg?.id) {
                            setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, id: dbMsg.id } : m));
                        }
                    }).catch(console.error);
            }

        } catch (error: any) {
            const isCurrentChat = fetchIdRef.current === currentFetchId;

            if (error.name === 'AbortError') {
                if (isCurrentChat) {
                    setRegeneratingBotId(null);
                }
                setMessages(prev => {
                    const exists = prev.some(m => m.id === botMessageId);
                    if (!exists) return [...prev, { id: botMessageId, text: finalBotText, sender: 'bot', isStopped: true }];
                    return prev.map(m => (m.id === botMessageId ? { ...m, text: finalBotText, isStopped: true } : m));
                });

                if (status === 'authenticated' && currentConvId) {
                    // RÉPARATION : Enregistrement du vrai ID même après une interruption manuelle
                    fetch(`/api/conversations/${currentConvId}/messages`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sender: 'bot', text: finalBotText, isStopped: true })
                    })
                        .then(res => res.json())
                        .then(dbMsg => {
                            if (dbMsg?.id) {
                                setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, id: dbMsg.id } : m));
                            }
                        }).catch(console.error);
                }
            } else {
                if (isCurrentChat) {
                    replaceBotMessage("Désolé, une erreur de connexion est survenue.");
                }
            }
        } finally {
            if (fetchIdRef.current === currentFetchId) {
                setIsLoading(false);
                abortControllerRef.current = null;
            }
        }
    }, [
        onStartTyping,
        onConversationCreated,
        onTitleGenerated,
        existingConversationTitles
    ]);

    const updateMessage = useCallback(async (id: number | string, newText: string, currentMessages: Message[]) => {
        const trimmed = newText.trim();
        if (!trimmed) return;

        const idx = currentMessages.findIndex(m => m.id === id);
        if (idx === -1) return;

        if (onStartTyping) onStartTyping();

        fetchIdRef.current += 1;
        const currentFetchId = fetchIdRef.current;

        const nextMsg = currentMessages[idx + 1];
        const botExists = !!nextMsg && nextMsg.sender === 'bot';
        const botId = botExists ? nextMsg.id : Date.now() + 1;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (onBeforeRegenerate) onBeforeRegenerate(botId);

        setMessages(prev => {
            let updated = prev.map(m => (m.id === id ? { ...m, text: trimmed } : m));
            if (botExists) {
                updated = updated.map(m => (m.id === botId ? { ...m, text: '', isStopped: false } : m));
            } else {
                const insertIdx = updated.findIndex(m => m.id === id) + 1;
                updated = [
                    ...updated.slice(0, insertIdx),
                    { id: botId, text: '', sender: 'bot' },
                    ...updated.slice(insertIdx),
                ];
            }
            return updated;
        });

        setRegeneratingBotId(botId);
        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        const ensureBotMessage = (text: string) => {
            if (fetchIdRef.current !== currentFetchId) return;
            setMessages(prev => prev.map(m => (m.id === botId ? { ...m, text: m.text + text } : m)));
        };

        const replaceBotMessage = (fullText: string) => {
            if (fetchIdRef.current !== currentFetchId) return;
            setMessages(prev => prev.map(m => (m.id === botId ? { ...m, text: fullText } : m)));
        };

        let currentConvId = convIdRef.current;
        let finalBotText = '';

        try {
            if (status === 'authenticated' && currentConvId && typeof id === 'string' && fetchIdRef.current === currentFetchId) {
                fetch(`/api/conversations/${currentConvId}/messages/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: trimmed })
                }).catch(console.error);
            }

            if (fetchIdRef.current !== currentFetchId) return;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: trimmed }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok || !response.body) throw new Error('Network error');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let isInterrupted = false;

            while (true) {
                if (fetchIdRef.current !== currentFetchId) {
                    reader.cancel();
                    isInterrupted = true;
                    break;
                }
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
                                setRegeneratingBotId(null);
                                ensureBotMessage(event.text);
                                finalBotText += event.text;
                            } else if (event.type === 'done') {
                                setRegeneratingBotId(null);
                                replaceBotMessage(event.text);
                                finalBotText = event.text;
                            } else if (event.type === 'error') {
                                setRegeneratingBotId(null);
                                replaceBotMessage(`Désolé, une erreur est survenue : ${event.text}`);
                                finalBotText = `Désolé, une erreur est survenue : ${event.text}`;
                            }
                        } catch { }
                    }
                    boundary = buffer.indexOf('\n\n');
                }
            }

            if (status === 'authenticated' && currentConvId && finalBotText) {
                const payload = { sender: 'bot', text: finalBotText, isStopped: false };
                if (isInterrupted || fetchIdRef.current !== currentFetchId) {
                    payload.isStopped = true;
                }

                if (typeof botId === 'string') {
                    fetch(`/api/conversations/${currentConvId}/messages/${botId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }).catch(console.error);
                } else {
                    // RÉPARATION : Injection du vrai ID généré lors d'une regénération
                    fetch(`/api/conversations/${currentConvId}/messages`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    })
                        .then(res => res.json())
                        .then(dbMsg => {
                            if (dbMsg?.id) {
                                setMessages(prev => prev.map(m => m.id === botId ? { ...m, id: dbMsg.id } : m));
                            }
                        }).catch(console.error);
                }
            }

        } catch (error: any) {
            const isCurrentChat = fetchIdRef.current === currentFetchId;

            if (error.name === 'AbortError') {
                if (isCurrentChat) {
                    setRegeneratingBotId(null);
                }
                setMessages(prev => prev.map(m => m.id === botId ? { ...m, text: finalBotText, isStopped: true } : m));

                if (status === 'authenticated' && currentConvId) {
                    if (typeof botId === 'string') {
                        fetch(`/api/conversations/${currentConvId}/messages/${botId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: finalBotText, isStopped: true })
                        }).catch(console.error);
                    } else {
                        fetch(`/api/conversations/${currentConvId}/messages`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sender: 'bot', text: finalBotText, isStopped: true })
                        })
                            .then(res => res.json())
                            .then(dbMsg => {
                                if (dbMsg?.id) {
                                    setMessages(prev => prev.map(m => m.id === botId ? { ...m, id: dbMsg.id } : m));
                                }
                            }).catch(console.error);
                    }
                }
            } else {
                if (isCurrentChat) {
                    setRegeneratingBotId(null);
                    replaceBotMessage("Désolé, une erreur de connexion est survenue.");
                }
            }
        } finally {
            if (fetchIdRef.current === currentFetchId) {
                setIsLoading(false);
                setRegeneratingBotId(null);
                abortControllerRef.current = null;
            }
        }
    }, [onBeforeRegenerate, onStartTyping]);

    const regenerateMessage = useCallback(async (botId: string | number) => {
        // 1. Trouver le message du bot et la question précédente de l'utilisateur
        const idx = messages.findIndex(m => m.id === botId);
        if (idx === -1) return;

        const userMsg = messages[idx - 1];
        if (!userMsg || userMsg.sender !== 'user') return;

        const question = userMsg.text;

        // 2. Préparer l'interface et bloquer les anciennes requêtes
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (onBeforeRegenerate) onBeforeRegenerate(botId);

        fetchIdRef.current += 1;
        const currentFetchId = fetchIdRef.current;

        setMessages(prev => prev.map(m => (m.id === botId ? { ...m, text: '', isStopped: false } : m)));
        setRegeneratingBotId(botId);
        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        const ensureBotMessage = (chunk: string) => {
            if (fetchIdRef.current !== currentFetchId) return;
            setMessages(prev => prev.map(m => (m.id === botId ? { ...m, text: m.text + chunk } : m)));
        };

        const replaceBotMessage = (fullText: string) => {
            if (fetchIdRef.current !== currentFetchId) return;
            setMessages(prev => prev.map(m => (m.id === botId ? { ...m, text: fullText } : m)));
        };

        let currentConvId = convIdRef.current;
        let finalBotText = '';

        try {
            // Effacer le contenu du message arrêté en base de données avant de relancer
            if (status === 'authenticated' && currentConvId && typeof botId === 'string' && fetchIdRef.current === currentFetchId) {
                fetch(`/api/conversations/${currentConvId}/messages/${botId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: '', isStopped: false })
                }).catch(console.error);
            }

            if (fetchIdRef.current !== currentFetchId) return;

            // 3. Relancer la génération
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok || !response.body) throw new Error('Network error');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let isInterrupted = false;

            while (true) {
                if (fetchIdRef.current !== currentFetchId) {
                    reader.cancel();
                    isInterrupted = true;
                    break;
                }
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
                                setRegeneratingBotId(null);
                                ensureBotMessage(event.text);
                                finalBotText += event.text;
                            } else if (event.type === 'done') {
                                setRegeneratingBotId(null);
                                replaceBotMessage(event.text);
                                finalBotText = event.text;
                            } else if (event.type === 'error') {
                                setRegeneratingBotId(null);
                                replaceBotMessage(`Désolé, une erreur est survenue : ${event.text}`);
                                finalBotText = `Désolé, une erreur est survenue : ${event.text}`;
                            }
                        } catch { }
                    }
                    boundary = buffer.indexOf('\n\n');
                }
            }

            // 4. Sauvegarder la nouvelle réponse
            if (status === 'authenticated' && currentConvId && finalBotText) {
                const payload = { sender: 'bot', text: finalBotText, isStopped: false };
                if (isInterrupted || fetchIdRef.current !== currentFetchId) {
                    payload.isStopped = true;
                }

                if (typeof botId === 'string') {
                    fetch(`/api/conversations/${currentConvId}/messages/${botId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }).catch(console.error);
                }
            }
        } catch (error: any) {
            const isCurrentChat = fetchIdRef.current === currentFetchId;

            if (error.name === 'AbortError') {
                if (isCurrentChat) {
                    setRegeneratingBotId(null);
                }
                // Placé en dehors du if : met toujours à jour l'UI comme "stoppée"
                setMessages(prev => prev.map(m => m.id === botId ? { ...m, text: finalBotText, isStopped: true } : m));

                if (status === 'authenticated' && currentConvId && typeof botId === 'string') {

                    fetch(`/api/conversations/${currentConvId}/messages/${botId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: finalBotText, isStopped: true })
                    }).catch(console.error);
                }
            } else {
                if (isCurrentChat) {
                    setRegeneratingBotId(null);
                    replaceBotMessage("Désolé, une erreur de connexion est survenue.");
                }
            }
        } finally {
            if (fetchIdRef.current === currentFetchId) {
                setIsLoading(false);
                setRegeneratingBotId(null);
                abortControllerRef.current = null;
            }
        }
    }, [messages, onBeforeRegenerate, onStartTyping]);

    return {
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
    };
}