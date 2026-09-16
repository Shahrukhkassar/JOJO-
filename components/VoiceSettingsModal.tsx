'use client';

import React, { useMemo } from 'react';
import { Volume2, X, Play, RotateCcw, Sparkles, CheckCircle2 } from 'lucide-react';
import { speakText, getRankedVoices } from '@/lib/speech';

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
  const rankedVoices = useMemo(() => {
    return getRankedVoices(voices);
  }, [voices]);

  if (!isOpen) return null;

  const handleTestSpeech = () => {
    speakText('Hey there! Main Jojo hoon ✨ Kaisi lag rahi hai meri aawaz? I am right here with you!', {
      voice: selectedVoice,
      rate,
      pitch,
    });
  };

  const handleResetDefaults = () => {
    // 0.98 rate for natural, warm, relaxed conversational flow
    // 1.00 pitch for natural grounded female pitch without metallic or chipmunk distortion
    onChangeRate(0.98);
    onChangePitch(1.0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div
        id="voice-settings-modal"
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-pink-50/50">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <Volume2 className="w-4 h-4 text-rose-500" />
            <span>Natural Voice &amp; Delivery Settings</span>
          </div>
          <button
            id="close-voice-settings-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm text-slate-700 overflow-y-auto">
          {/* Auto Speak Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="font-medium text-slate-900 text-xs md:text-sm flex items-center gap-1.5">
                <span>Auto-Speak Responses</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-normal">
                  Real-time
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Jojo begins speaking her replies with natural breathing pauses
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
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="jojo-voice-select"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1"
              >
                <span>Conversational Female Voice</span>
                <Sparkles className="w-3 h-3 text-rose-400" />
              </label>
              {selectedVoice && (
                <span className="text-[10px] text-rose-600 font-medium flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              )}
            </div>

            <select
              id="jojo-voice-select"
              value={selectedVoice?.name || ''}
              onChange={(e) => {
                const opt = rankedVoices.find((v) => v.name === e.target.value);
                onSelectVoice(opt?.voice || null);
              }}
              className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all font-medium"
            >
              {rankedVoices.length === 0 && <option value="">Default Browser Voice</option>}
              {rankedVoices.map((opt, i) => (
                <option key={i} value={opt.name}>
                  {opt.badge ? `[${opt.badge}] ` : ''}
                  {opt.name} ({opt.lang})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Top natural female voices (e.g., Microsoft Sonia/Neerja, Apple Samantha/Veena, Google Female) are prioritized automatically.
            </p>
          </div>

          {/* Speed Slider */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
              <span>Natural Pacing &amp; Speed</span>
              <span className="text-rose-600 font-semibold">{rate.toFixed(2)}x</span>
            </div>
            <input
              id="voice-rate-slider"
              type="range"
              min="0.80"
              max="1.20"
              step="0.02"
              value={rate}
              onChange={(e) => onChangeRate(parseFloat(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Relaxed (0.85x)</span>
              <span>Conversational (0.98x)</span>
              <span>Brisk (1.15x)</span>
            </div>
          </div>

          {/* Pitch Slider */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
              <span>Vocal Warmth &amp; Pitch</span>
              <span className="text-rose-600 font-semibold">{pitch.toFixed(2)}</span>
            </div>
            <input
              id="voice-pitch-slider"
              type="range"
              min="0.92"
              max="1.12"
              step="0.02"
              value={pitch}
              onChange={(e) => onChangePitch(parseFloat(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Warm / Soft (0.96)</span>
              <span>Natural Balanced (1.00)</span>
              <span>Bright (1.06)</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
            <button
              onClick={handleResetDefaults}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Recommended</span>
            </button>
            <button
              onClick={handleTestSpeech}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-200 flex items-center gap-1.5 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Preview Voice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
