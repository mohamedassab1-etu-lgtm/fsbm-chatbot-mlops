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

  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Références pour la visualisation audio (ondes du micro)
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // États et références pour le Textarea (Gemini Input)
  const [isTall, setIsTall] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hiddenTextRef = useRef<HTMLSpanElement>(null);

  const userName = "Mohamed";
  const userFullName = "Mohamed Assab";

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Le formulaire du bas est en position "absolute", donc il flotte
  // par-dessus la liste des messages - il faut réserver exactement sa
  // hauteur réelle en padding-bottom sur la zone scrollable, sinon le
  // texte se retrouve caché derrière (sa hauteur varie : textarea multi-
  // lignes, mode fullscreen, etc., donc un padding fixe ne suffit pas).
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(160);

  useEffect(() => {
    const node = footerRef.current;
    if (!node) return;

    const updateHeight = () => setFooterHeight(node.offsetHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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

  // Logique d'auto-agrandissement et de positionnement des boutons
  useEffect(() => {
    if (textareaRef.current && hiddenTextRef.current) {
      // 1. Cacher l'overflow temporairement pour empêcher la scrollbar de fausser la largeur
      textareaRef.current.style.overflow = 'hidden';

      // 2. Mettre la hauteur à 0 (bien plus fiable que 'auto') pour un recalcul parfait
      textareaRef.current.style.height = '0px';

      // 3. Mesurer la hauteur réelle du contenu
      const scrollHeight = textareaRef.current.scrollHeight;

      // 4. Appliquer la nouvelle hauteur calculée (ou 'auto' si plein écran pour laisser flex-1 gérer)
      if (isFullscreen) {
        textareaRef.current.style.height = 'auto';
      } else {
        textareaRef.current.style.height = `${Math.min(scrollHeight, 246)}px`;
      }

      // 5. Rendre le contrôle de l'overflow à la classe Tailwind (overflow-y-auto)
      textareaRef.current.style.overflow = '';

      // Mesure la largeur exacte du texte
      const textWidth = hiddenTextRef.current.getBoundingClientRect().width;

      // isTall s'active uniquement s'il y a physiquement plus d'une ligne
      setIsTall(scrollHeight > 40);
      // isWide s'active pour baisser les boutons AVANT que le texte ne les touche (vers 75%)
      setIsWide(textWidth > 470);
    }
  }, [input, isFullscreen]); // <--- L'ajout clé est ici : le useEffect écoute maintenant isFullscreen

  // Initialisation de la reconnaissance vocale (Web Speech API)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Compatibilité pour Chrome/Edge et Safari
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true; // Continue d'écouter même s'il y a des pauses
        recognitionRef.current.interimResults = true; // Récupère aussi les résultats provisoires pour l'aperçu en direct
        recognitionRef.current.lang = 'fr-FR'; // Tu peux mettre 'en-US' ou 'ar-SA' selon ton besoin

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
            // Ajoute le texte avec un espace intelligent
            setInput(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript);
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
              "Si tu utilises Brave, désactive les Shields pour ce site (icône du lion dans la barre d'adresse), " +
              "puis réessaie. Sinon, vérifie ta connexion internet."
            );
          } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            alert("L'accès au microphone a été refusé. Autorise-le dans les paramètres du navigateur.");
          }
          // 'no-speech' : rien détecté, pas besoin d'alerter l'utilisateur
        };

        recognitionRef.current.onend = () => {
          // Si on s'arrête de parler trop longtemps, on coupe le visuel
          setIsListening(false);
          setInterimTranscript('');
          stopAudioVisualization();
        };
      }
    }
  }, []);

  // Dessine les barres d'onde en fonction du volume capté par le micro
  const drawWaveform = () => {
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

    ctx.fillStyle = '#f28b82'; // Rouge doux assorti au bouton micro actif

    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i * step] || 0;
      const barHeight = Math.max(3, (value / 255) * height);
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barHeight);
    }
  };

  // Démarre la capture micro dédiée à la visualisation (indépendante de la reconnaissance vocale)
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
      // La visu est un bonus : si le micro est indisponible pour ça, on continue sans planter
      console.error("Impossible de démarrer la visualisation audio :", err);
    }
  };

  // Coupe proprement le flux micro et le contexte audio utilisés pour la visu
  const stopAudioVisualization = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    const canvas = waveformCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Nettoyage si le composant est démonté pendant une écoute
  useEffect(() => {
    return () => stopAudioVisualization();
  }, []);

  // Fonction pour allumer/éteindre le micro
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

  // Envoi du message avec la touche "Entrée" (sans Shift)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        sendMessage();
      }
    }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);

    // Réinitialisation de l'input - le useEffect([input, isFullscreen])
    // se charge déjà de remesurer et réajuster la hauteur du textarea
    // (et isTall/isWide) dès que `input` change, donc pas besoin de le
    // refaire ici à la main.
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

          {/* Profil utilisateur - Photo 30x30, gap de 8px (gap-2), et nom en 15px */}
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
      <main className="flex-1 flex flex-col relative min-w-0 bg-[#131314] overflow-x-hidden">

        {/* 1. Historique de chat (Affiché uniquement s'il y a des messages) */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#424446] [&::-webkit-scrollbar-thumb]:rounded-full" style={{ paddingBottom: footerHeight + 24 }}>
            <div className="w-[724px] mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`text-[17px] leading-relaxed py-[20px] px-[28px] rounded-[40px] ${msg.sender === 'user' ? 'max-w-[452px] bg-[#1e1f20] text-[#e3e3e3]' : 'max-w-[724px] text-[#e3e3e3]'}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start gap-4">
                  <div className="w-6 h-6 shrink-0 mt-1 animate-pulse opacity-50">
                    <img src="/fsbm-assistant-logo-mini.png" alt="Loading" className="w-full h-full object-contain" />
                  </div>
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
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* 2. Conteneur principal dynamique (Centre l'écran d'accueil OU se fixe en bas si messages) */}
        <div ref={footerRef} className={messages.length === 0 ? "flex flex-col items-center justify-center w-full h-[calc(100vh-124px)] my-auto" : "absolute bottom-0 left-0 right-0 pt-10 pb-6 bg-gradient-to-t from-[#131314] via-[#131314] to-transparent transition-all duration-500"}>

          {/* Écran d'accueil (Caché s'il y a des messages OU si le mode Fullscreen est actif) */}
          {messages.length === 0 && !isFullscreen && (
            <div className="flex flex-col items-center justify-center px-4 mb-8">
              <img src="/fsbm-asstistant-logo.png" alt="FSBM Full Logo" className="h-20 sm:h-28 object-contain mb-6 opacity-90" />
              <h2 className="text-3xl sm:text-4xl font-medium tracking-tight bg-gradient-to-r from-[#d8d8d8] to-[#6b6b6b] bg-clip-text text-transparent">
                What can I help with, {userName}?
              </h2>
            </div>
          )}

          <div className={`max-w-3xl w-full mx-auto px-4 ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
            {/* Formulaire avec hauteur conditionnelle pour le mode Fullscreen */}
            <form onSubmit={sendMessage} className={`relative flex flex-col w-[660px] mx-auto bg-[#1e1f20] hover:bg-[#282a2c] transition-colors border border-transparent focus-within:border-[#333538] shadow-sm ${isFullscreen ? 'flex-1 rounded-[24px] p-3 pb-14' : (isTall || isWide) ? 'min-h-[64px] rounded-[24px] p-3 pb-14' : 'min-h-[64px] rounded-[32px] p-3 justify-center'}`}>

              {/* Indicateur d'écoute vocale : ondes en direct + transcription provisoire */}
              {isListening && (
                <div className="absolute -top-[60px] left-1/2 -translate-x-1/2 w-max max-w-[90%] flex items-center gap-3 bg-[#1e1f20] border border-[#333538] rounded-full pl-3 pr-4 py-2 shadow-lg z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <canvas ref={waveformCanvasRef} width={100} height={24} className="shrink-0" />
                  <span className="text-[13px] text-[#c4c7c5] truncate max-w-[260px]">
                    {interimTranscript || "Je t'écoute..."}
                  </span>
                </div>
              )}

              {/* Bouton Fullscreen qui n'apparaît QUE s'il y a plus d'une ligne */}
              {(isTall || isFullscreen) && (
                <div className="absolute top-3 right-3 z-10 group/tooltip">
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="flex items-center justify-center w-8 h-8 text-[#c4c7c5] hover:text-[#e3e3e3] hover:bg-[#333538] rounded-full transition-colors cursor-pointer"
                  >
                    {isFullscreen ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                        <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                        <polyline points="15 3 21 3 21 9" /><line x1="21" y1="3" x2="14" y2="10" /><polyline points="9 21 3 21 3 15" /><line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    )}
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-[#e3e3e3] text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                    {isFullscreen ? 'Collapse' : 'Fullscreen'}
                  </div>
                </div>
              )}

              {/* Span caché pour mesurer la largeur du texte avec précision */}
              <span
                ref={hiddenTextRef}
                className="absolute invisible whitespace-pre font-sans text-[16px] leading-relaxed tracking-normal pointer-events-none"
                aria-hidden="true"
              >
                {input || ' '}
              </span>

              {/* Textarea auto-extensible */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask FSBM Assistant"
                rows={1}
                // add a red border
                className={`w-full bg-transparent text-[#e3e3e3] placeholder-[#8e918f] text-[16px] resize-none focus:outline-none focus:ring-0 pl-2 pr-[56px] leading-relaxed overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#424446] [&::-webkit-scrollbar-thumb]:rounded-full ${isFullscreen ? 'flex-1' : ''}`}
                style={{ maxHeight: isFullscreen ? 'none' : '246px' }}
                disabled={isLoading}
              />

              {/* Actions (Microphone et Envoi) en bas à droite */}
              <div className={`absolute right-3 flex items-center gap-1.5 transition-all ${isTall || isWide || isFullscreen ? 'bottom-3' : 'top-1/2 -translate-y-1/2'}`}>

                {/* Bouton Micro (Toujours présent) avec Tooltip en bas */}
                <div className="relative flex items-center group/tooltip">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`flex items-center justify-center w-8 h-8 transition-colors rounded-full cursor-pointer shadow-sm ${isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'text-[#c4c7c5] hover:text-[#e3e3e3] hover:bg-[#333538]'
                      }`}
                  >
                    {isListening ? (
                      // Icône Stop (Carré) quand ça écoute
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[14px] h-[14px]">
                        <rect x="6" y="6" width="12" height="12" rx="2" ry="2" />
                      </svg>
                    ) : (
                      // Icône Micro quand c'est éteint
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                      </svg>
                    )}
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-[#e3e3e3] text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                    {isListening ? 'Stop listening' : 'Speak'}
                  </div>
                </div>

                {input.trim() && (
                  <div className="relative flex items-center group/tooltip animate-in fade-in zoom-in-95 duration-200">
                    <button type="submit" disabled={isLoading} className="flex items-center justify-center w-8 h-8 rounded-full bg-[#e3e3e3] text-[#131314] hover:bg-white transition-colors shadow-sm cursor-pointer">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                    </button>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-[#e3e3e3] text-[#131314] text-[12px] font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 delay-0 group-hover/tooltip:delay-300 pointer-events-none whitespace-nowrap z-50 transition-all shadow-sm">
                      Submit
                    </div>
                  </div>
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