'use client';

// Speech Synthesis & Recognition helpers

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  return window.speechSynthesis.getVoices();
}

/**
 * Finds best feminine, warm voice with preference for en-IN or hi-IN, or pleasant English
 */
export function getBestJojoVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // 1. Check for Indian English female voice (e.g. Heera, Veena, Google en-IN, India)
  const indianFemale = voices.find(
    (v) =>
      (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('hi-in')) &&
      (v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('heera') ||
        v.name.toLowerCase().includes('veena') ||
        v.name.toLowerCase().includes('google'))
  );
  if (indianFemale) return indianFemale;

  // 2. Any en-IN voice
  const anyIndian = voices.find((v) => v.lang.toLowerCase().includes('en-in'));
  if (anyIndian) return anyIndian;

  // 3. Known warm pleasant female voices (Samantha, Karen, Victoria, Zira, Google UK English Female)
  const warmFemale = voices.find(
    (v) =>
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('zira') ||
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('natural')
  );
  if (warmFemale) return warmFemale;

  // 4. Any English voice
  const anyEnglish = voices.find((v) => v.lang.startsWith('en'));
  return anyEnglish || voices[0] || null;
}

/**
 * Speaks text using Web Speech API with expressive pacing
 */
export function speakText(
  text: string,
  options: {
    voice?: SpeechSynthesisVoice | null;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: unknown) => void;
  } = {}
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Clean text of markdown asterisks and URLs for spoken audio
  const cleanSpokenText = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .trim();

  if (!cleanSpokenText) return;

  const utterance = new SpeechSynthesisUtterance(cleanSpokenText);

  if (options.voice) {
    utterance.voice = options.voice;
  }
  utterance.rate = options.rate ?? 1.0;
  utterance.pitch = options.pitch ?? 1.08; // slightly higher warm young-adult tone

  if (options.onStart) utterance.onstart = options.onStart;
  if (options.onEnd) utterance.onend = options.onEnd;
  if (options.onError) utterance.onerror = options.onError;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
