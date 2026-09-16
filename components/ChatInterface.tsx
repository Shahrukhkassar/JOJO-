'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings2,
  BookOpen,
  Sparkles,
  RefreshCw,
  Heart,
  Lightbulb,
  Zap,
  LogIn,
  LogOut,
  Cloud,
  Check,
  Bookmark,
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import JojoAvatar, { JojoEmotion } from '@/components/Avatar';
import QuizCard, { QuizData } from '@/components/QuizCard';
import VoiceSettingsModal from '@/components/VoiceSettingsModal';
import StudyDeckModal from '@/components/StudyDeckModal';
import {
  getAvailableVoices,
  getBestJojoVoice,
  speakText,
  stopSpeaking,
} from '@/lib/speech';
import {
  db,
  persistChatMessage,
  persistStudyNote,
  persistQuizResult,
  handleFirestoreError,
  OperationType,
  FirestoreChatMessage,
} from '@/lib/firebase';
import { useFirebase } from '@/components/FirebaseProvider';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emotion?: JojoEmotion;
  language?: string;
  gentleCorrection?: string | null;
  studyInsight?: string | null;
  quiz?: QuizData | null;
  timestamp: string;
}

type ChatMode = 'casual' | 'study_bams' | 'english_practice';
type UserMoodState = 'normal' | 'tired' | 'stressed' | 'happy';

let messageCounter = 0;
function createId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${messageCounter}`;
}

function getFormattedTime(dateObj?: Date): string {
  const d = dateObj || new Date();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: { resultIndex: number; results: Array<Array<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
}

export default function ChatInterface() {
  const { user, userProfile, signIn, signOut, updateSettings } = useFirebase();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Hey there! Main Jojo hoon ✨ Kaisi ho tum? Ya kaisa chal raha hai sab? Whether you want to talk about your day, relax, or revise BAMS subjects and English together—main hamesha yahin hoon tumhare saath! Batao, aaj kaisa mood hai?',
      emotion: 'caring',
      language: 'Hinglish',
      timestamp: 'Just now',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<JojoEmotion>('caring');
  const [activeMode, setActiveMode] = useState<ChatMode>('casual');
  const [userMood, setUserMood] = useState<UserMoodState>('normal');
  const [savedNotesMap, setSavedNotesMap] = useState<Record<string, boolean>>({});

  // Voice State
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(1.08);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Study Deck Modal
  const [isStudyDeckOpen, setIsStudyDeckOpen] = useState(false);

  // Speech Recognition (Mic Input)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Effective voice preferences (derived from userProfile if authenticated)
  const effectiveVoiceRate = userProfile?.preferredVoiceSpeed ?? voiceRate;
  const effectiveVoicePitch = userProfile?.preferredPitch ?? voicePitch;
  const effectiveAutoSpeak = userProfile?.autoPlayVoice ?? autoSpeak;

  // Load Voices on Mount
  useEffect(() => {
    const updateVoices = () => {
      const available = getAvailableVoices();
      setVoices(available);
      if (available.length > 0 && !selectedVoice) {
        const best = getBestJojoVoice(available);
        setSelectedVoice(best);
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedVoice]);

  // Real-time messages sync from Firestore for authenticated users
  useEffect(() => {
    if (!user) return;

    const messagesPath = `users/${user.uid}/messages`;
    const q = query(
      collection(db, 'users', user.uid, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: ChatMessage[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as FirestoreChatMessage;
            loaded.push({
              id: data.id,
              role: data.role,
              content: data.content,
              emotion: data.emotion as JojoEmotion,
              language: data.language,
              timestamp: getFormattedTime(new Date(data.createdAt)),
            });
          });
          setMessages(loaded);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, messagesPath);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const windowObj = window as unknown as Record<string, unknown>;
      const SpeechRecognitionConstructor = (windowObj.SpeechRecognition ||
        windowObj.webkitSpeechRecognition) as {
        new (): {
          continuous: boolean;
          interimResults: boolean;
          lang: string;
          onresult: (event: { resultIndex: number; results: Array<Array<{ transcript: string }>> }) => void;
          onend: () => void;
          onerror: () => void;
          start: () => void;
          stop: () => void;
        };
      };

      if (SpeechRecognitionConstructor) {
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Indian English / Hinglish friendly

        recognition.onresult = (event) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setInput(currentTranscript);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    const recognition = recognitionRef.current;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      setIsSpeaking(false);
      try {
        recognition.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  // Play audio for a specific message
  const handlePlayMessageAudio = (msg: ChatMessage) => {
    if (currentlySpeakingId === msg.id && isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
      return;
    }

    stopSpeaking();
    setCurrentlySpeakingId(msg.id);
    setIsSpeaking(true);

    speakText(msg.content, {
      voice: selectedVoice,
      rate: voiceRate,
      pitch: voicePitch,
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        setCurrentlySpeakingId(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setCurrentlySpeakingId(null);
      },
    });
  };

  const handleSaveStudyInsight = async (msgId: string, insightContent: string) => {
    if (!user) {
      await signIn();
      return;
    }

    try {
      await persistStudyNote(user.uid, {
        id: createId('note'),
        userId: user.uid,
        title: insightContent.slice(0, 60) + (insightContent.length > 60 ? '...' : ''),
        topic: activeMode === 'study_bams' ? 'BAMS Sharir' : 'Revision Insight',
        content: insightContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setSavedNotesMap((prev) => ({ ...prev, [msgId]: true }));
    } catch (err) {
      console.error('Failed to save study note:', err);
    }
  };

  const handleQuizAnswerRecorded = (result: {
    question: string;
    selectedOption: string;
    correctOption: string;
    isCorrect: boolean;
    explanation: string;
  }) => {
    if (user) {
      persistQuizResult(user.uid, {
        id: createId('quiz'),
        userId: user.uid,
        question: result.question,
        selectedOption: result.selectedOption,
        correctOption: result.correctOption,
        isCorrect: result.isCorrect,
        explanation: result.explanation,
        createdAt: new Date().toISOString(),
      }).catch((err) => console.error('Error recording quiz:', err));
    }
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText || input).trim();
    if (!textToSend || loading) return;

    setInput('');
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const nowIso = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: createId('user'),
      role: 'user',
      content: textToSend,
      timestamp: getFormattedTime(),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setLoading(true);

    // Persist user message to Firebase Firestore
    if (user) {
      persistChatMessage(user.uid, {
        id: userMessage.id,
        userId: user.uid,
        role: 'user',
        content: textToSend,
        createdAt: nowIso,
      }).catch((err) => console.error('Error saving user message to Firestore:', err));
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: messages.slice(-8).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode: activeMode,
          userMood,
        }),
      });

      if (!res.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await res.json();
      const assistantEmotion = (data.emotion || 'caring') as JojoEmotion;
      setCurrentEmotion(assistantEmotion);

      const assistantMsgId = createId('assistant');
      const assistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: data.reply || data.fallbackReply || 'I am here with you ✨',
        emotion: assistantEmotion,
        language: data.language || 'Hinglish',
        gentleCorrection: data.gentleCorrection,
        studyInsight: data.studyInsight,
        quiz: data.quiz,
        timestamp: getFormattedTime(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Persist assistant message to Firebase Firestore
      if (user) {
        persistChatMessage(user.uid, {
          id: assistantMsgId,
          userId: user.uid,
          role: 'assistant',
          content: assistantMessage.content,
          emotion: assistantMessage.emotion,
          language: assistantMessage.language,
          createdAt: new Date().toISOString(),
        }).catch((err) => console.error('Error saving assistant message to Firestore:', err));
      }

      // Auto-speak reply if enabled
      if (autoSpeak && assistantMessage.content) {
        handlePlayMessageAudio(assistantMessage);
      }
    } catch {
      const fallbackMsg: ChatMessage = {
        id: createId('assistant-err'),
        role: 'assistant',
        content: 'Arey sweetie, internet thoda blink ho gaya! Main yahin hoon, please tell me again!',
        emotion: 'caring',
        timestamp: getFormattedTime(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    stopSpeaking();
    setIsSpeaking(false);
    setCurrentlySpeakingId(null);
    setMessages([
      {
        id: createId('reset'),
        role: 'assistant',
        content: 'Clean slate! Main yahin hoon tumhare saath. Batao, what shall we explore or talk about now?',
        emotion: 'happy',
        timestamp: getFormattedTime(),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#FAF7F5] text-slate-800 antialiased overflow-hidden">
      {/* Top Header */}
      <header
        id="jojo-header"
        className="shrink-0 px-4 py-2.5 bg-white/85 backdrop-blur-md border-b border-rose-100 flex items-center justify-between z-20 shadow-2xs"
      >
        {/* Left: Avatar & Identity */}
        <div className="flex items-center gap-3">
          <JojoAvatar
            emotion={currentEmotion}
            isSpeaking={isSpeaking}
            isThinking={loading}
            size="md"
            onClick={() => {
              setCurrentEmotion('playful');
              speakText('Hehe, sending you a warm hug!', { voice: selectedVoice });
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900">Jojo</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-100/80 text-rose-700 border border-rose-200/60">
                AI Companion
              </span>
              {user && (
                <span
                  title="Synced with Firebase Firestore"
                  className="hidden md:inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"
                >
                  <Cloud className="w-3 h-3 text-emerald-500" />
                  Synced
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSpeaking
                    ? 'bg-rose-500 animate-ping'
                    : loading
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-500'
                }`}
              />
              <span className="capitalize text-[11px] sm:text-xs">
                {isSpeaking
                  ? 'Speaking with you 🎙️'
                  : loading
                  ? 'Thinking gently...'
                  : `${currentEmotion} mood`}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mode Switcher */}
        <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 text-xs">
          <button
            id="mode-casual-btn"
            onClick={() => setActiveMode('casual')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeMode === 'casual'
                ? 'bg-white text-rose-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💬 Chit-Chat
          </button>
          <button
            id="mode-bams-btn"
            onClick={() => setActiveMode('study_bams')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeMode === 'study_bams'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌿 BAMS Study
          </button>
          <button
            id="mode-english-btn"
            onClick={() => setActiveMode('english_practice')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeMode === 'english_practice'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🗣️ English Practice
          </button>
        </div>

        {/* Right: Actions & User Auth */}
        <div className="flex items-center gap-1.5">
          {/* Study Deck Opener */}
          <button
            id="open-study-deck-btn"
            onClick={() => setIsStudyDeckOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
            title="BAMS Syllabus & Study Hub"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Audio Quick Mute Toggle */}
          <button
            id="toggle-auto-speak-btn"
            onClick={() => {
              if (isSpeaking) {
                stopSpeaking();
                setIsSpeaking(false);
              }
              const nextVal = !autoSpeak;
              setAutoSpeak(nextVal);
              if (user) {
                updateSettings({ autoPlayVoice: nextVal });
              }
            }}
            className={`p-2 rounded-xl border transition-colors ${
              autoSpeak
                ? 'text-rose-600 bg-rose-50/70 border-rose-200'
                : 'text-slate-400 bg-slate-50 border-slate-200'
            }`}
            title={autoSpeak ? 'Voice output is ON' : 'Voice output is MUTED'}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Voice Settings */}
          <button
            id="open-voice-settings-btn"
            onClick={() => setIsVoiceModalOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Voice & Speech Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Reset Chat */}
          <button
            id="clear-chat-btn"
            onClick={clearChat}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Start Fresh Conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Google Auth Status / Sign In Button */}
          {user ? (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200">
              <div
                title={`Signed in as ${user.displayName || user.email}`}
                className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold ring-2 ring-rose-200"
              >
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-full h-full rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  (user.displayName || user.email || 'U')[0].toUpperCase()
                )}
              </div>
              <button
                id="firebase-signout-btn"
                onClick={signOut}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="firebase-signin-btn"
              onClick={signIn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-2xs transition-colors"
              title="Sign in with Google to sync with Firebase"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Mode Selector Row */}
      <div className="sm:hidden px-3 py-1.5 bg-white/60 border-b border-rose-100 flex items-center justify-around text-xs">
        <button
          onClick={() => setActiveMode('casual')}
          className={`px-2.5 py-1 rounded-md font-medium ${
            activeMode === 'casual' ? 'bg-rose-500 text-white' : 'text-slate-600'
          }`}
        >
          💬 Chat
        </button>
        <button
          onClick={() => setActiveMode('study_bams')}
          className={`px-2.5 py-1 rounded-md font-medium ${
            activeMode === 'study_bams' ? 'bg-emerald-600 text-white' : 'text-slate-600'
          }`}
        >
          🌿 BAMS
        </button>
        <button
          onClick={() => setActiveMode('english_practice')}
          className={`px-2.5 py-1 rounded-md font-medium ${
            activeMode === 'english_practice' ? 'bg-indigo-600 text-white' : 'text-slate-600'
          }`}
        >
          🗣️ English
        </button>
      </div>

      {/* User Mood Bar & Quick Context */}
      <div className="shrink-0 px-4 py-1.5 bg-amber-50/50 border-b border-amber-100/60 flex items-center justify-between text-xs overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 text-slate-600 shrink-0">
          <Heart className="w-3.5 h-3.5 text-rose-500" />
          <span className="font-medium">How are you feeling?</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { key: 'normal', label: '😊 Good / Balanced', emoji: '😊' },
            { key: 'tired', label: '🥱 Tired / Exhausted', emoji: '🥱' },
            { key: 'stressed', label: '😣 Stressed / Exam Panic', emoji: '😣' },
            { key: 'happy', label: '🥳 Happy & Energetic', emoji: '🥳' },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setUserMood(m.key as UserMoodState)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                userMood === m.key
                  ? 'bg-amber-200 text-amber-900 border border-amber-300 shadow-2xs font-semibold'
                  : 'bg-white/80 text-slate-600 hover:bg-amber-100/60 border border-amber-100'
              }`}
            >
              <span>{m.emoji}</span>
              <span className="hidden md:inline">{m.label.split(' ')[1]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cloud Sync Announcement if guest */}
      {!user && (
        <div className="shrink-0 px-4 py-1.5 bg-rose-50/70 border-b border-rose-100/80 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <Cloud className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>
              <strong>Firebase Firestore is active!</strong> Sign in with Google to sync your study notes, chat logs, and quiz results across devices.
            </span>
          </div>
          <button
            onClick={signIn}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 underline underline-offset-2 shrink-0 ml-2"
          >
            Connect now
          </button>
        </div>
      )}

      {/* Main Chat Scroll View */}
      <main
        id="jojo-messages-container"
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-4xl w-full mx-auto"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isThisSpeaking = isSpeaking && currentlySpeakingId === msg.id;
            const isNoteSaved = savedNotesMap[msg.id];

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* Jojo Avatar Icon on Assistant messages */}
                {!isUser && (
                  <div className="shrink-0 mt-1">
                    <JojoAvatar
                      emotion={msg.emotion || 'caring'}
                      isSpeaking={isThisSpeaking}
                      isThinking={false}
                      size="sm"
                    />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-2xs transition-all ${
                    isUser
                      ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-tr-none'
                      : 'bg-white border border-rose-100 text-slate-800 rounded-tl-none shadow-xs'
                  }`}
                >
                  {/* Assistant Message Header / Tags */}
                  {!isUser && (
                    <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-rose-700">Jojo</span>
                        {msg.emotion && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-600 border border-rose-200/50 capitalize">
                            {msg.emotion}
                          </span>
                        )}
                      </div>

                      {/* Play/Stop Audio Button */}
                      <button
                        onClick={() => handlePlayMessageAudio(msg)}
                        className={`p-1 rounded-md transition-colors ${
                          isThisSpeaking
                            ? 'text-rose-600 bg-rose-100 animate-pulse'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                        title={isThisSpeaking ? 'Stop speaking' : 'Listen to Jojo voice'}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Message Text Content */}
                  <div className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>

                  {/* Gentle Language Correction Card (if provided) */}
                  {msg.gentleCorrection && (
                    <div className="mt-3 p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200/70 text-indigo-900 text-xs flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block mb-0.5">Language Warm Tip:</span>
                        <span>{msg.gentleCorrection}</span>
                      </div>
                    </div>
                  )}

                  {/* BAMS Golden Nugget / Study Insight (if provided) */}
                  {msg.studyInsight && (
                    <div className="mt-3 p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/70 text-emerald-900 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block mb-0.5">Ayurvedic Insight:</span>
                            <span>{msg.studyInsight}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSaveStudyInsight(msg.id, msg.studyInsight!)}
                          disabled={isNoteSaved}
                          className={`shrink-0 px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors ${
                            isNoteSaved
                              ? 'bg-emerald-200 text-emerald-900 border-emerald-300'
                              : 'bg-white hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                          title="Save note to Firebase Firestore"
                        >
                          {isNoteSaved ? <Check className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                          <span>{isNoteSaved ? 'Saved' : 'Save Note'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Interactive Study Quiz (if provided) */}
                  {msg.quiz && (
                    <QuizCard
                      quiz={msg.quiz}
                      onQuizAnswered={handleQuizAnswerRecorded}
                      onAskDeeper={(q) =>
                        handleSend(`Jojo, can you explain the clinical reasoning behind: "${q}"?`)
                      }
                    />
                  )}

                  {/* Timestamp */}
                  <div
                    className={`mt-2 text-[10px] text-right ${
                      isUser ? 'text-slate-400' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Loading Indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <JojoAvatar emotion={currentEmotion} isSpeaking={false} isThinking={true} size="sm" />
            <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-white border border-rose-100 shadow-2xs flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" />
              <span
                className="w-2 h-2 rounded-full bg-rose-400 animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
              <span
                className="w-2 h-2 rounded-full bg-rose-400 animate-bounce"
                style={{ animationDelay: '0.4s' }}
              />
              <span className="ml-1 text-slate-600">Jojo is writing...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Suggested Topic Chips */}
      <div className="shrink-0 px-4 py-2 border-t border-slate-200/70 bg-white/70 backdrop-blur-xs flex items-center gap-2 overflow-x-auto text-xs max-w-4xl w-full mx-auto">
        <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500" />
          Try:
        </span>
        {[
          { label: '🌿 Tridoshas summary', prompt: 'Jojo, can you explain Vata, Pitta, and Kapha with easy examples?' },
          { label: '🎯 Quiz on Sapta Dhatus', prompt: 'Jojo, quiz me on Sapta Dhatus and Ojas!' },
          { label: '🥱 Aaj bohot thak gaya hoon', prompt: 'Yaar Jojo, aaj bohot zyada thak gaya hoon, thoda cheer up kar do na.' },
          { label: '🗣️ English doctor consultation', prompt: 'Let us practice an English medical consultation together.' },
          { label: '✨ Tell me a sweet thought', prompt: 'Tell me something sweet and comforting for my day.' },
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip.prompt)}
            disabled={loading}
            className="px-2.5 py-1 rounded-full bg-rose-50/70 text-rose-700 hover:bg-rose-100/90 border border-rose-200/50 transition-colors shrink-0 whitespace-nowrap"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Message Input Bar */}
      <footer
        id="jojo-input-bar"
        className="shrink-0 px-4 py-3 bg-white border-t border-slate-200 shadow-xs z-20"
      >
        <div className="max-w-4xl mx-auto flex items-end gap-2.5">
          {/* Microphone Dictation Button */}
          <button
            id="jojo-mic-button"
            onClick={toggleMic}
            className={`p-3 rounded-xl border transition-all shrink-0 ${
              isListening
                ? 'bg-rose-500 text-white border-rose-600 shadow-md animate-pulse'
                : 'bg-slate-50 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border-slate-200'
            }`}
            title={isListening ? 'Listening to your voice... (Click to stop)' : 'Click to speak to Jojo'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Textarea Input */}
          <div className="relative flex-1 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100 transition-all">
            <textarea
              id="jojo-user-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? 'Listening to you speak...'
                  : activeMode === 'study_bams'
                  ? 'Ask any BAMS topic (e.g. Kriya Sharir, Dhatus, Dravya Guna, Agni)...'
                  : activeMode === 'english_practice'
                  ? 'Write in English or Hinglish—I will converse and guide you gently...'
                  : 'Talk to Jojo in Hindi, English, or Hinglish...'
              }
              className="w-full px-4 py-3 bg-transparent text-sm md:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none max-h-32"
            />
          </div>

          {/* Send Button */}
          <button
            id="jojo-send-button"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className={`p-3 rounded-xl transition-all shrink-0 flex items-center justify-center ${
              !input.trim() || loading
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                : 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm'
            }`}
            title="Send Message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        voices={voices}
        selectedVoice={selectedVoice}
        onSelectVoice={(v) => setSelectedVoice(v)}
        rate={voiceRate}
        onChangeRate={(r) => {
          setVoiceRate(r);
          if (user) updateSettings({ preferredVoiceSpeed: r });
        }}
        pitch={voicePitch}
        onChangePitch={(p) => {
          setVoicePitch(p);
          if (user) updateSettings({ preferredPitch: p });
        }}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={(enabled) => {
          setAutoSpeak(enabled);
          if (user) updateSettings({ autoPlayVoice: enabled });
        }}
      />

      {/* Study Deck Modal */}
      <StudyDeckModal
        isOpen={isStudyDeckOpen}
        onClose={() => setIsStudyDeckOpen(false)}
        onSelectTopic={(prompt) => handleSend(prompt)}
      />
    </div>
  );
}
