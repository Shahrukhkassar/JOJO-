'use client';

// Speech Synthesis & Recognition helpers with Neural/Natural voice prioritization,
// progressive sentence pacing, breath pauses, and zero-overlap speech queue management.

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
  isNatural: boolean;
  isFemale: boolean;
  badge?: string;
  score: number;
}

/**
 * Returns available voices from window.speechSynthesis
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  return window.speechSynthesis.getVoices();
}

/**
 * Known legacy or robotic voice names to penalize
 */
const ROBOTIC_VOICE_NAMES = [
  'espeak',
  'david',
  'mark',
  'george',
  'fred',
  'cellos',
  'zarvox',
  'bad news',
  'bells',
  'boing',
  'albert',
  'trinoids',
  'whisper',
  'organ',
  'bahh',
  'deranged',
  'good news',
  'hysterical',
  'junior',
  'pipe organ',
];

/**
 * Premium natural / neural female voice identifiers
 */
const PREMIUM_NATURAL_KEYWORDS = [
  'online (natural)',
  'natural',
  'neural',
  'enhanced',
  'premium',
  'multilingual',
];

const PREFERRED_FEMALE_NAMES = [
  'neerja', // Microsoft Neerja Online (Natural) - Hindi
  'sonia',  // Microsoft Sonia Online (Natural) - Indian English
  'swara',  // Microsoft Swara Online (Natural) - Hindi
  'heera',  // Microsoft Heera - English (India)
  'veena',  // Apple Veena - English (India)
  'lekha',  // Apple Lekha - Hindi
  'samantha', // Apple Samantha (Enhanced)
  'karen',  // Apple Karen (Enhanced)
  'victoria',
  'zira',   // Microsoft Zira Desktop
  'aria',   // Microsoft Aria Online (Natural)
  'jenny',  // Microsoft Jenny Online (Natural)
  'female',
  'woman',
];

/**
 * Scores a voice for naturalness, femininity, and Indian/English conversational suitability
 */
export function scoreVoice(voice: SpeechSynthesisVoice): { score: number; isNatural: boolean; isFemale: boolean; badge?: string } {
  const nameLower = voice.name.toLowerCase();
  const langLower = voice.lang.toLowerCase();

  // Instant penalty for known robotic/male voices
  for (const robot of ROBOTIC_VOICE_NAMES) {
    if (nameLower.includes(robot)) {
      return { score: -100, isNatural: false, isFemale: false };
    }
  }

  let score = 0;
  let isNatural = false;
  let isFemale = false;
  let badge: string | undefined = undefined;

  // 1. Natural / Neural detection
  if (PREMIUM_NATURAL_KEYWORDS.some((kw) => nameLower.includes(kw))) {
    score += 60;
    isNatural = true;
    badge = '⭐ Neural Natural';
  } else if (nameLower.includes('google')) {
    score += 35;
    isNatural = true;
    badge = 'Google Voice';
  }

  // 2. Female detection
  if (PREFERRED_FEMALE_NAMES.some((fn) => nameLower.includes(fn))) {
    score += 40;
    isFemale = true;
  } else if (!nameLower.includes('male') && !nameLower.includes('man') && !nameLower.includes('boy')) {
    // Neutral or unstated, small bonus if it sounds like a female persona
    score += 10;
  }

  // 3. Locale scoring
  if (langLower.startsWith('en-in') || langLower.startsWith('hi-in') || langLower === 'hi') {
    score += 50; // Highest preference for Indian English / Hindi friendly
    if (!badge && isFemale) badge = 'Indian English/Hindi';
  } else if (langLower.startsWith('en-gb')) {
    score += 30; // British English sounds very calm, conversational, and articulate
  } else if (langLower.startsWith('en-us') || langLower.startsWith('en')) {
    score += 25; // Standard English
  } else {
    score -= 20; // Non-English / Non-Hindi
  }

  // Specific top-tier favorites:
  if (nameLower.includes('sonia') || nameLower.includes('neerja') || nameLower.includes('swara')) {
    score += 30;
    badge = '⭐ Best Companion Match';
  } else if (nameLower.includes('samantha') && isNatural) {
    score += 25;
    badge = '⭐ High Quality Enhanced';
  }

  return { score, isNatural, isFemale, badge };
}

/**
 * Returns ranked list of available voices from most natural to least
 */
export function getRankedVoices(voices: SpeechSynthesisVoice[]): VoiceOption[] {
  if (!voices || voices.length === 0) return [];

  const evaluated: VoiceOption[] = voices.map((v) => {
    const { score, isNatural, isFemale, badge } = scoreVoice(v);
    return {
      voice: v,
      name: v.name,
      lang: v.lang,
      isNatural,
      isFemale,
      badge,
      score,
    };
  });

  // Sort descending by score
  return evaluated.sort((a, b) => b.score - a.score);
}

/**
 * Finds the single best natural, warm female voice available in the current browser/OS
 */
export function getBestJojoVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;
  const ranked = getRankedVoices(voices);
  return ranked.length > 0 && ranked[0].score > 0 ? ranked[0].voice : voices[0] || null;
}

/**
 * Cleans text for speech synthesis:
 * - Strips code blocks, markdown asterisks, hashtags, URLs, bullet numbers
 * - Removes emojis that synthesizers stumble on
 * - Normalizes ellipses, Sanskrit transliteration slashes, and pauses
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';

  return (
    text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove URLs
      .replace(/https?:\/\/\S+/gi, '')
      // Remove Markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // Remove markdown bold / italic / strike
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      // Remove markdown headings
      .replace(/^#{1,6}\s+/gm, '')
      // Remove blockquotes and list markers
      .replace(/^>\s+/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // Strip emojis (preserves text fluidity)
      .replace(
        /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
        ''
      )
      // Normalize double dashes or long dashes into gentle pauses
      .replace(/—/g, ', ')
      .replace(/--/g, ', ')
      // Normalize ellipses to natural comma pauses
      .replace(/\.{3,}/g, '... ')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Splits text into natural sentence chunks for conversational rhythm and near-instant time-to-first-speech
 */
export function splitIntoSpeechSentences(text: string): string[] {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return [];

  // Match sentences ending in punctuation or clause boundaries
  const regex = /[^.!?\n]+(?:[.!?\n]+|$)/g;
  const rawMatches = cleaned.match(regex) || [cleaned];

  const sentences: string[] = [];
  for (const raw of rawMatches) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // If a sentence is very long (> 160 characters), break it gently at a comma or semicolon
    if (trimmed.length > 160 && trimmed.includes(',')) {
      const parts = trimmed.split(/,\s*/);
      let current = '';
      for (const part of parts) {
        if ((current + ', ' + part).length > 130 && current.length > 0) {
          sentences.push(current.trim());
          current = part;
        } else {
          current = current ? `${current}, ${part}` : part;
        }
      }
      if (current.trim()) {
        sentences.push(current.trim());
      }
    } else {
      sentences.push(trimmed);
    }
  }

  return sentences.length > 0 ? sentences : [cleaned];
}

/**
 * Internal Speech Queue State Manager
 * Prevents audio overlaps, supports instant interruption, and coordinates sentence playback
 */
class SpeechQueueManager {
  private queue: string[] = [];
  private isSpeaking = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onStartCallback?: () => void;
  private onEndCallback?: () => void;
  private onErrorCallback?: (err: unknown) => void;
  private activeOptions: {
    voice?: SpeechSynthesisVoice | null;
    rate?: number;
    pitch?: number;
  } = {};
  private activeMessageId: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  public speak(
    text: string,
    options: {
      messageId?: string;
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

    // Cancel any previous active or queued speech immediately
    this.stop();

    const sentences = splitIntoSpeechSentences(text);
    if (sentences.length === 0) {
      options.onEnd?.();
      return;
    }

    this.queue = sentences;
    this.activeMessageId = options.messageId || null;
    this.activeOptions = {
      voice: options.voice,
      // Default to 0.98 for relaxed conversational warmth; cap within natural human range
      rate: Math.min(Math.max(options.rate ?? 0.98, 0.8), 1.25),
      // Default to 1.0 for grounded natural female voice, avoiding metallic/chipmunk artifacts
      pitch: Math.min(Math.max(options.pitch ?? 1.0, 0.92), 1.15),
    };
    this.onStartCallback = options.onStart;
    this.onEndCallback = options.onEnd;
    this.onErrorCallback = options.onError;

    this.isSpeaking = true;
    this.onStartCallback?.();

    this.playNextSentence();
  }

  private playNextSentence() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (this.queue.length === 0) {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.activeMessageId = null;
      this.onEndCallback?.();
      return;
    }

    const sentence = this.queue.shift();
    if (!sentence) {
      this.playNextSentence();
      return;
    }

    // Workaround for browser speech engine getting stuck
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // Ignore
    }

    const utterance = new SpeechSynthesisUtterance(sentence);
    if (this.activeOptions.voice) {
      utterance.voice = this.activeOptions.voice;
    }
    utterance.rate = this.activeOptions.rate ?? 0.98;
    utterance.pitch = this.activeOptions.pitch ?? 1.0;

    utterance.onend = () => {
      // Small 75ms natural breathing pause between sentences
      this.timer = setTimeout(() => {
        if (this.isSpeaking) {
          this.playNextSentence();
        }
      }, 75);
    };

    utterance.onerror = (e) => {
      // Ignore 'interrupted' or 'canceled' errors when user purposely stopped
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('SpeechSynthesis sentence notice:', e.error);
        this.onErrorCallback?.(e);
      }
      // Continue to next sentence if not explicitly stopped
      if (this.isSpeaking) {
        this.playNextSentence();
      }
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue = [];
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.activeMessageId = null;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    this.onEndCallback?.();
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getActiveMessageId(): string | null {
    return this.activeMessageId;
  }
}

// Global Singleton
const globalSpeechManager = new SpeechQueueManager();

/**
 * Public speak function that uses the sentence-by-sentence queue with breath pauses
 */
export function speakText(
  text: string,
  options: {
    messageId?: string;
    voice?: SpeechSynthesisVoice | null;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: unknown) => void;
  } = {}
) {
  globalSpeechManager.speak(text, options);
}

/**
 * Public stop speaking function
 */
export function stopSpeaking() {
  globalSpeechManager.stop();
}

/**
 * Check if speaking
 */
export function isCurrentlySpeaking(): boolean {
  return globalSpeechManager.getIsSpeaking();
}
