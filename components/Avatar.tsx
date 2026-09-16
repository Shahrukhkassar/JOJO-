'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Heart, BookOpen, Smile, Sun, Moon } from 'lucide-react';

export type JojoEmotion =
  | 'happy'
  | 'caring'
  | 'playful'
  | 'encouraging'
  | 'calm'
  | 'enthusiastic'
  | 'focused';

interface AvatarProps {
  emotion: JojoEmotion;
  isSpeaking: boolean;
  isThinking: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const emotionStyles: Record<
  JojoEmotion,
  {
    auraGradient: string;
    borderAccent: string;
    badgeText: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }
> = {
  caring: {
    auraGradient: 'from-rose-400/25 via-pink-300/20 to-amber-200/15',
    borderAccent: 'border-rose-300',
    badgeText: 'Caring & Warm',
    icon: Heart,
    accentColor: 'text-rose-500',
  },
  happy: {
    auraGradient: 'from-amber-300/30 via-orange-200/25 to-pink-300/15',
    borderAccent: 'border-amber-300',
    badgeText: 'Cheerful & Bright',
    icon: Sun,
    accentColor: 'text-amber-500',
  },
  playful: {
    auraGradient: 'from-pink-400/30 via-purple-300/25 to-rose-300/20',
    borderAccent: 'border-pink-300',
    badgeText: 'Playful & Witty',
    icon: Smile,
    accentColor: 'text-pink-500',
  },
  encouraging: {
    auraGradient: 'from-orange-400/25 via-amber-300/25 to-rose-200/20',
    borderAccent: 'border-orange-300',
    badgeText: 'Encouraging',
    icon: Sparkles,
    accentColor: 'text-orange-500',
  },
  calm: {
    auraGradient: 'from-teal-300/25 via-sky-200/25 to-indigo-200/20',
    borderAccent: 'border-teal-300',
    badgeText: 'Calm & Gentle',
    icon: Moon,
    accentColor: 'text-teal-600',
  },
  enthusiastic: {
    auraGradient: 'from-fuchsia-400/30 via-pink-400/25 to-amber-300/20',
    borderAccent: 'border-fuchsia-400',
    badgeText: 'Super Proud!',
    icon: Sparkles,
    accentColor: 'text-fuchsia-500',
  },
  focused: {
    auraGradient: 'from-emerald-400/25 via-teal-300/25 to-amber-200/20',
    borderAccent: 'border-emerald-400',
    badgeText: 'Study Partner',
    icon: BookOpen,
    accentColor: 'text-emerald-600',
  },
};

export default function JojoAvatar({
  emotion,
  isSpeaking,
  isThinking,
  size = 'md',
  onClick,
}: AvatarProps) {
  const current = emotionStyles[emotion] || emotionStyles.caring;
  const EmotionIcon = current.icon;

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-24 h-24 text-base',
  }[size];

  return (
    <div
      id="jojo-avatar-container"
      className="relative flex flex-col items-center cursor-pointer select-none group"
      onClick={onClick}
      title="Click to share love with Jojo"
    >
      {/* Dynamic Animated Ambient Aura */}
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-tr ${current.auraGradient} blur-xl -z-10`}
        animate={{
          scale: isSpeaking ? [1, 1.35, 1.1, 1.4, 1] : isThinking ? [1, 1.2, 1] : [1, 1.1, 1],
          opacity: isSpeaking ? [0.6, 0.9, 0.6] : [0.4, 0.6, 0.4],
        }}
        transition={{
          repeat: Infinity,
          duration: isSpeaking ? 1.4 : isThinking ? 2 : 3.5,
          ease: 'easeInOut',
        }}
      />

      {/* Outer Sound Wave Rings when Speaking */}
      {isSpeaking && (
        <>
          <motion.div
            className={`absolute -inset-2 rounded-full border border-rose-300/50 -z-10`}
            animate={{ scale: [1, 1.25, 1.3], opacity: [0.8, 0.3, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeOut' }}
          />
          <motion.div
            className={`absolute -inset-4 rounded-full border border-pink-400/30 -z-10`}
            animate={{ scale: [1, 1.4, 1.5], opacity: [0.6, 0.15, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, delay: 0.3, ease: 'easeOut' }}
          />
        </>
      )}

      {/* Main Avatar Bubble */}
      <motion.div
        id="jojo-avatar-face"
        className={`relative ${sizeClasses} rounded-full bg-gradient-to-b from-rose-50 via-pink-50 to-amber-50/70 border-2 ${current.borderAccent} shadow-md flex items-center justify-center overflow-hidden transition-colors duration-500`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Subtle inner highlight */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/20 to-white/60 pointer-events-none" />

        {/* Stylized Character Face SVG */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full object-contain p-1.5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hair back / silhouette */}
          <path
            d="M20 50C20 30 32 15 50 15C68 15 80 30 80 50C80 72 72 82 72 82C68 85 64 68 64 68L36 68C36 68 32 85 28 82C28 82 20 72 20 50Z"
            fill="#4A342B"
          />
          {/* Soft Hair Fringe/Bangs */}
          <path
            d="M26 40C32 26 46 22 50 22C54 22 68 26 74 40C74 40 68 32 50 32C32 32 26 40 26 40Z"
            fill="#5E4035"
          />

          {/* Face skin */}
          <ellipse cx="50" cy="53" rx="24" ry="24" fill="#FEEFE8" />

          {/* Cute subtle blush on cheeks */}
          <circle cx="34" cy="58" r="4.5" fill="#FDA4AF" opacity="0.65" />
          <circle cx="66" cy="58" r="4.5" fill="#FDA4AF" opacity="0.65" />

          {/* Expressive Eyes */}
          {emotion === 'playful' ? (
            // Winking playful eye
            <>
              {/* Left eye winking curve */}
              <path
                d="M32 50Q36 46 40 50"
                stroke="#37221A"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Right eye open sparkle */}
              <circle cx="63" cy="50" r="3.5" fill="#37221A" />
              <circle cx="64" cy="49" r="1.2" fill="#FFFFFF" />
            </>
          ) : emotion === 'calm' ? (
            // Relaxed happy curved eyes
            <>
              <path
                d="M32 50Q36 46 40 50"
                stroke="#37221A"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M60 50Q64 46 68 50"
                stroke="#37221A"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </>
          ) : emotion === 'happy' || emotion === 'enthusiastic' ? (
            // Cheerful happy eyes
            <>
              <path
                d="M32 51Q36 45 40 51"
                stroke="#37221A"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <path
                d="M60 51Q64 45 68 51"
                stroke="#37221A"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </>
          ) : (
            // Natural big warm caring eyes
            <>
              <circle cx="37" cy="50" r="3.8" fill="#3A231C" />
              <circle cx="38.5" cy="48.5" r="1.5" fill="#FFFFFF" />
              <circle cx="63" cy="50" r="3.8" fill="#3A231C" />
              <circle cx="64.5" cy="48.5" r="1.5" fill="#FFFFFF" />
            </>
          )}

          {/* Expressive Mouth */}
          {isSpeaking ? (
            // Animated talking mouth
            <motion.ellipse
              cx="50"
              cy="62"
              rx="4"
              ry="3"
              fill="#E11D48"
              animate={{ ry: [1.5, 3.5, 1.5], rx: [3, 4.5, 3] }}
              transition={{ repeat: Infinity, duration: 0.28 }}
            />
          ) : emotion === 'happy' || emotion === 'enthusiastic' ? (
            // Happy gentle open smile
            <path
              d="M44 60Q50 67 56 60"
              stroke="#D9466F"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="#F43F5E"
            />
          ) : emotion === 'playful' ? (
            // Playful smirk
            <path
              d="M45 61Q51 65 57 60"
              stroke="#D9466F"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ) : (
            // Soft warm smile
            <path
              d="M44 61Q50 66 56 61"
              stroke="#D9466F"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          )}

          {/* Cute little hair blossom/accessory */}
          <circle cx="68" cy="34" r="4.5" fill="#FB7185" />
          <circle cx="68" cy="34" r="1.8" fill="#FDE047" />
        </svg>

        {/* Small Thinking Spinner Ring */}
        {isThinking && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-dashed border-rose-400"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
          />
        )}
      </motion.div>

      {/* Tiny Emotion Floating Mini Badge */}
      <AnimatePresence mode="wait">
        <motion.div
          key={emotion}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          className={`absolute -bottom-1 -right-1 bg-white shadow-sm border border-slate-200 rounded-full p-0.5 ${current.accentColor}`}
          title={current.badgeText}
        >
          <EmotionIcon className="w-3.5 h-3.5" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
