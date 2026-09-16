'use client';

import React from 'react';
import { Volume2, X, Play, RotateCcw } from 'lucide-react';
import { speakText } from '@/lib/speech';

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  onSelectVoice: (voice: SpeechSynthesisVoice | null) => void;
  rate: number;
  onChangeRate: (rate: number) => void;
  pitch: number;
  onChangePitch: (pitch: number) => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: (enabled: boolean) => void;
}

export default function VoiceSettingsModal({
  isOpen,
  onClose,
  voices,
  selectedVoice,
  onSelectVoice,
  rate,
  onChangeRate,
  pitch,
  onChangePitch,
  autoSpeak,
  onToggleAutoSpeak,
}: VoiceSettingsProps) {
  if (!isOpen) return null;

  const handleTestSpeech = () => {
    speakText('Namaste! Main Jojo hoon. Kaisi lag rahi hai meri aawaz?', {
      voice: selectedVoice,
      rate,
      pitch,
    });
  };

  const handleResetDefaults = () => {
    onChangeRate(1.0);
    onChangePitch(1.08);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div
        id="voice-settings-modal"
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-pink-50/50">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <Volume2 className="w-4 h-4 text-rose-500" />
            <span>Voice &amp; Audio Delivery</span>
          </div>
          <button
            id="close-voice-settings-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm text-slate-700">
          {/* Auto Speak Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="font-medium text-slate-900 text-xs md:text-sm">
                Auto-Speak Responses
              </div>
              <div className="text-[11px] text-slate-500">
                Jojo will speak her replies out loud automatically
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="auto-speak-toggle-input"
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => onToggleAutoSpeak(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>

          {/* Voice Selector */}
          <div>
            <label
              htmlFor="jojo-voice-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Select Speech Synthesis Voice
            </label>
            <select
              id="jojo-voice-select"
              value={selectedVoice?.name || ''}
              onChange={(e) => {
                const voice = voices.find((v) => v.name === e.target.value) || null;
                onSelectVoice(voice);
              }}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              {voices.length === 0 && <option value="">Default Browser Voice</option>}
              {voices.map((v, i) => (
                <option key={i} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Recommended: Natural Indian English (en-IN) or Hindi female voice.
            </p>
          </div>

          {/* Speed Slider */}
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <span>Speaking Speed</span>
              <span className="text-slate-500">{rate.toFixed(2)}x</span>
            </div>
            <input
              id="voice-rate-slider"
              type="range"
              min="0.75"
              max="1.3"
              step="0.05"
              value={rate}
              onChange={(e) => onChangeRate(parseFloat(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>

          {/* Pitch Slider */}
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <span>Voice Warmth / Pitch</span>
              <span className="text-slate-500">{pitch.toFixed(2)}</span>
            </div>
            <input
              id="voice-pitch-slider"
              type="range"
              min="0.9"
              max="1.3"
              step="0.05"
              value={pitch}
              onChange={(e) => onChangePitch(parseFloat(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
            <button
              onClick={handleResetDefaults}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleTestSpeech}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Preview Voice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
