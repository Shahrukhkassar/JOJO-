'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';

export interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizCardProps {
  quiz: QuizData;
  onAskDeeper?: (topic: string) => void;
}

export default function QuizCard({ quiz, onAskDeeper }: QuizCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSelect = (index: number) => {
    if (hasSubmitted) return;
    setSelectedIndex(index);
    setHasSubmitted(true);
  };

  const isCorrect = selectedIndex !== null && selectedIndex === quiz.correctIndex;

  return (
    <div
      id="jojo-study-quiz-card"
      className="my-3 p-4 rounded-xl bg-gradient-to-br from-amber-50/80 via-white to-rose-50/60 border border-amber-200/80 shadow-sm text-slate-800"
    >
      <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold uppercase tracking-wider text-amber-800">
        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
        <span>Jojo&apos;s Mini Study Quiz</span>
      </div>

      <p className="font-medium text-slate-800 text-sm md:text-base leading-snug mb-3">
        {quiz.question}
      </p>

      <div className="space-y-2 mb-3">
        {quiz.options.map((option, idx) => {
          const isThisSelected = selectedIndex === idx;
          const isThisCorrect = idx === quiz.correctIndex;

          let btnStyles = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';

          if (hasSubmitted) {
            if (isThisCorrect) {
              btnStyles = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-medium';
            } else if (isThisSelected && !isCorrect) {
              btnStyles = 'bg-rose-50 border-rose-300 text-rose-900';
            } else {
              btnStyles = 'bg-white/60 border-slate-100 text-slate-400 opacity-60';
            }
          }

          return (
            <button
              key={idx}
              id={`quiz-option-${idx}`}
              onClick={() => handleSelect(idx)}
              disabled={hasSubmitted}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-sm transition-all duration-200 flex items-center justify-between gap-2 ${btnStyles}`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold bg-slate-100 text-slate-600 shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{option}</span>
              </div>

              {hasSubmitted && (
                <div>
                  {isThisCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {isThisSelected && !isCorrect && (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {hasSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg text-xs leading-relaxed ${
            isCorrect
              ? 'bg-emerald-100/70 border border-emerald-200 text-emerald-900'
              : 'bg-rose-100/70 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="font-semibold mb-1 flex items-center gap-1.5">
            {isCorrect ? (
              <>
                <span>✨ Sahi pakde hain! Jojo is proud of you!</span>
              </>
            ) : (
              <>
                <HelpCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Koi baat nahi, seekhte hain!</span>
              </>
            )}
          </div>
          <p>{quiz.explanation}</p>

          {onAskDeeper && (
            <button
              onClick={() => onAskDeeper(quiz.question)}
              className="mt-2 text-xs font-medium inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 underline underline-offset-2"
            >
              Ask Jojo to explain this in detail
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}
