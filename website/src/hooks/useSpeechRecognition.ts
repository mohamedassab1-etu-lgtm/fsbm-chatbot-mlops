import { useState, useRef, useEffect, useCallback } from 'react';

// On passe un callback au hook pour qu'il sache quoi faire du texte final
type UseSpeechRecognitionProps = {
    onTranscript: (transcript: string) => void;
};

export function useSpeechRecognition({ onTranscript }: UseSpeechRecognitionProps) {
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const recognitionRef = useRef<any>(null);

    // Sauvegarde le callback dans une ref pour éviter de relancer les useEffect si la fonction change
    const onTranscriptRef = useRef(onTranscript);
    useEffect(() => {
        onTranscriptRef.current = onTranscript;
    }, [onTranscript]);

    // Références pour la visualisation audio (ondes du micro)
    const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const stopAudioVisualization = useCallback(() => {
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(track => track.stop());
            micStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        analyserRef.current = null;

        const canvas = waveformCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    // Initialisation de la reconnaissance vocale (Web Speech API)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = 'fr-FR';

                recognitionRef.current.onresult = (event: any) => {
                    let finalTranscript = '';
                    let interim = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript;
                        } else {
                            interim += transcript;
                        }
                    }
                    if (finalTranscript) {
                        onTranscriptRef.current(finalTranscript);
                        setInterimTranscript('');
                    } else {
                        setInterimTranscript(interim);
                    }
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error("Erreur de reconnaissance vocale :", event.error);
                    setIsListening(false);
                    setInterimTranscript('');
                    stopAudioVisualization();

                    if (event.error === 'network') {
                        alert(
                            "Impossible de joindre le service de reconnaissance vocale.\n\n" +
                            "Si tu utilises Brave, désactive les Shields pour ce site, puis réessaie. Sinon, vérifie ta connexion internet."
                        );
                    } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
                        alert("L'accès au microphone a été refusé. Autorise-le dans les paramètres du navigateur.");
                    }
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                    setInterimTranscript('');
                    stopAudioVisualization();
                };
            }
        }

        return () => {
            stopAudioVisualization();
        };
    }, [stopAudioVisualization]);

    const drawWaveform = useCallback(() => {
        animationFrameRef.current = requestAnimationFrame(drawWaveform);

        const analyser = analyserRef.current;
        const canvas = waveformCanvasRef.current;
        if (!analyser || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        const barCount = 24;
        const step = Math.max(1, Math.floor(bufferLength / barCount));
        const barWidth = width / barCount;

        ctx.fillStyle = '#f28b82';

        for (let i = 0; i < barCount; i++) {
            const value = dataArray[i * step] || 0;
            const barHeight = Math.max(3, (value / 255) * height);
            const x = i * barWidth;
            const y = (height - barHeight) / 2;
            ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barHeight);
        }
    }, []);

    const startAudioVisualization = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = stream;

            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            analyserRef.current = analyser;

            drawWaveform();
        } catch (err) {
            console.error("Impossible de démarrer la visualisation audio :", err);
        }
    };

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            setInterimTranscript('');
            stopAudioVisualization();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
            startAudioVisualization();
        }
    };

    // On expose uniquement ce dont le composant UI aura besoin
    return {
        isListening,
        interimTranscript,
        toggleListening,
        waveformCanvasRef,
    };
}