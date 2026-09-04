import { useState, useRef, useEffect, useCallback } from 'react';

type UseAudioPlayerProps = {
    voicePreference: 'female' | 'male';
};

export function useAudioPlayer({ voicePreference }: UseAudioPlayerProps = { voicePreference: 'female' }) {
    const [speakingMessageId, setSpeakingMessageId] = useState<string | number | null>(null);
    const [isSpeechPaused, setIsSpeechPaused] = useState(false);
    const [speechProgress, setSpeechProgress] = useState(0);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState<string | number | null>(null);
    const [waveformLevels, setWaveformLevels] = useState<number[]>([4, 4, 4, 4, 4, 4, 4]);

    const audioElRef = useRef<HTMLAudioElement | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const waveformRafRef = useRef<number | null>(null);

    // Le cache stocke l'URL du fichier audio généré
    const audioCacheRef = useRef<Map<string | number, string>>(new Map());
    // Le tracker mémorise avec quelle voix ('male' ou 'female') l'audio a été généré
    const voiceTrackerRef = useRef<Map<string | number, string>>(new Map());

    const stopPlayback = useCallback(() => {
        if (waveformRafRef.current !== null) {
            cancelAnimationFrame(waveformRafRef.current);
            waveformRafRef.current = null;
        }
        if (audioElRef.current) {
            const audioEl = audioElRef.current;
            audioEl.onplay = null;
            audioEl.onpause = null;
            audioEl.ontimeupdate = null;
            audioEl.onended = null;
            audioEl.onerror = null;
            audioEl.pause();
            audioEl.src = '';
            audioElRef.current = null;
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close().catch(() => { });
            audioCtxRef.current = null;
        }
        analyserRef.current = null;
    }, []);

    const cleanupAudioAndCache = useCallback(() => {
        stopPlayback();
        audioCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
        audioCacheRef.current.clear();
        voiceTrackerRef.current.clear();
    }, [stopPlayback]);

    useEffect(() => {
        return () => cleanupAudioAndCache();
    }, [cleanupAudioAndCache]);

    const NUM_WAVEFORM_BARS = 7;
    const WAVEFORM_MIN_PX = 3;
    const WAVEFORM_MAX_PX = 16;

    const runWaveformLoop = useCallback(() => {
        const analyser = analyserRef.current;
        const audioEl = audioElRef.current;

        if (!analyser || !audioEl || audioEl.paused) return;

        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);

        const bucketSize = Math.max(1, Math.floor(data.length / NUM_WAVEFORM_BARS));
        const levels: number[] = [];
        for (let i = 0; i < NUM_WAVEFORM_BARS; i++) {
            let sum = 0;
            for (let j = 0; j < bucketSize; j++) sum += data[i * bucketSize + j] || 0;
            const avg = sum / bucketSize;
            levels.push(Math.round(WAVEFORM_MIN_PX + (avg / 255) * (WAVEFORM_MAX_PX - WAVEFORM_MIN_PX)));
        }
        setWaveformLevels(levels);

        waveformRafRef.current = requestAnimationFrame(runWaveformLoop);
    }, []);

    const playFromUrl = useCallback(async (url: string, messageId: string | number) => {
        const audioEl = new Audio(url);
        audioElRef.current = audioEl;

        audioEl.ontimeupdate = () => {
            if (audioEl.duration) setSpeechProgress(audioEl.currentTime / audioEl.duration);
        };
        audioEl.onplay = () => {
            setIsSpeechPaused(false);
            if (waveformRafRef.current === null) runWaveformLoop();
        };
        audioEl.onpause = () => {
            setIsSpeechPaused(true);
            if (waveformRafRef.current !== null) {
                cancelAnimationFrame(waveformRafRef.current);
                waveformRafRef.current = null;
            }
        };
        audioEl.onended = () => {
            setIsSpeechPaused(true);
            setSpeechProgress(1);
            if (waveformRafRef.current !== null) {
                cancelAnimationFrame(waveformRafRef.current);
                waveformRafRef.current = null;
            }
            setWaveformLevels(new Array(NUM_WAVEFORM_BARS).fill(WAVEFORM_MIN_PX));
        };
        audioEl.onerror = () => {
            setSpeakingMessageId(null);
            setIsGeneratingAudio(null);
            audioCacheRef.current.delete(messageId);
            voiceTrackerRef.current.delete(messageId);
            stopPlayback();
        };

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaElementSource(audioEl);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;

        await audioEl.play();
        setSpeakingMessageId(messageId);
        runWaveformLoop();
    }, [runWaveformLoop, stopPlayback]);

    const handleListen = useCallback(async (msg: { id: string | number, text: string }) => {
        if (speakingMessageId === msg.id || isGeneratingAudio === msg.id) return;

        stopPlayback();
        setIsSpeechPaused(false);
        setSpeechProgress(0);
        setSpeakingMessageId(null);

        // 1. Récupération des données en cache
        const cachedUrl = audioCacheRef.current.get(msg.id);
        const cachedVoice = voiceTrackerRef.current.get(msg.id);

        // 2. Si le cache existe ET que la voix mise en cache correspond aux paramètres actuels, on lit le cache.
        if (cachedUrl && cachedVoice === voicePreference) {
            try {
                await playFromUrl(cachedUrl, msg.id);
            } catch (err) {
                console.error("Impossible de lire l'audio en cache :", err);
                audioCacheRef.current.delete(msg.id);
                voiceTrackerRef.current.delete(msg.id);
                stopPlayback();
            }
            return;
        }

        // Sinon, on génère un nouvel audio
        setIsGeneratingAudio(msg.id);

        const textToSpeak = msg.text.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)/g, (match, localPart, domainPart) => {
            const spokenLocal = localPart.replace(/\./g, ' point ');
            const spokenDomain = domainPart.split('.').map((part: string) => {
                const lowerPart = part.toLowerCase();
                if (lowerPart === 'univh2c') return 'univ h 2 c';
                if (lowerPart === 'ma') return 'm a';
                return part;
            }).join(' point ');
            return `${spokenLocal} arobase ${spokenDomain}`;
        });

        try {
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: textToSpeak,
                    voicePreference // On envoie le paramètre au backend
                })
            });
            if (!res.ok) throw new Error('TTS request failed');

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            // 3. On sauvegarde la nouvelle URL et la voix utilisée pour la générer
            audioCacheRef.current.set(msg.id, url);
            voiceTrackerRef.current.set(msg.id, voicePreference);

            await playFromUrl(url, msg.id);
            setIsGeneratingAudio(null);
        } catch (err) {
            console.error("Impossible de générer ou de lire l'audio :", err);
            setIsGeneratingAudio(null);
            stopPlayback();
        }
    }, [isGeneratingAudio, playFromUrl, speakingMessageId, stopPlayback, voicePreference]);

    const toggleSpeechPause = useCallback(() => {
        const audioEl = audioElRef.current;
        if (!audioEl) return;
        if (audioEl.paused) {
            if (audioEl.ended) audioEl.currentTime = 0;
            audioEl.play();
        } else {
            audioEl.pause();
        }
    }, []);

    const closeSpeech = useCallback(() => {
        stopPlayback();
        setSpeakingMessageId(null);
        setIsSpeechPaused(false);
        setSpeechProgress(0);
        setIsGeneratingAudio(null);
    }, [stopPlayback]);

    const seekSpeech = useCallback((ratio: number) => {
        const audioEl = audioElRef.current;
        if (!audioEl || !audioEl.duration) return;
        audioEl.currentTime = ratio * audioEl.duration;
        setSpeechProgress(ratio);
    }, []);

    return {
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
    };
}