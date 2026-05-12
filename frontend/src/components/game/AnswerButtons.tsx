'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import type { AnswerAckPayload } from "@/types/game";

interface AnswerOption {
  id: string;
  option_text: string;
}

interface AnswerButtonsProps {
  options: AnswerOption[];
  selectedId?: string | null;
  correctId?: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
  answerResult?: AnswerAckPayload | null;
}

const AnswerButtons: React.FC<AnswerButtonsProps> = ({
  options,
  selectedId,
  correctId,
  disabled,
  onSelect,
  answerResult,
}) => {
  const kahootColors = [
    "bg-amber-500 border-amber-400/50 shadow-amber-500/20",
    "bg-blue-600 border-blue-500/50 shadow-blue-600/20",
    "bg-rose-600 border-rose-500/50 shadow-rose-600/20",
    "bg-emerald-600 border-emerald-500/50 shadow-emerald-600/20"
  ];

  const getButtonStyles = (optionId: string, index: number) => {
    const isSelected = selectedId === optionId;
    const isCorrect = (correctId === optionId) || (answerResult?.is_correct && isSelected);
    const isWrong = isSelected && ((correctId && correctId !== optionId) || (answerResult && answerResult.is_correct === false));

    if (isCorrect) {
      return "bg-emerald-500 border-emerald-300 text-white shadow-[0_0_40px_rgba(16,185,129,0.6)] scale-105 z-10 ring-4 ring-white/20";
    }
    if (isWrong) {
      return "bg-rose-600 border-rose-400 text-white shadow-[0_0_30px_rgba(244,63,94,0.4)] opacity-90 grayscale-[0.5] scale-95";
    }
    if (isSelected) {
      return "bg-indigo-600 border-indigo-300 text-white shadow-[0_0_30px_rgba(79,70,229,0.5)] scale-105 z-10 animate-bounce-short";
    }

    // Default Kahoot styles
    if (disabled) {
      return "bg-white/5 border-white/10 text-white/40 opacity-30 grayscale";
    }

    return cn(kahootColors[index % 4], "text-white shadow-xl hover:scale-[1.02] active:scale-95");
  };

  const getLetter = (index: number) => String.fromCharCode(65 + index);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto px-4">
      {options.map((option, index) => (
        <button
          key={option.id}
          disabled={disabled}
          onClick={() => onSelect(option.id)}
          className={cn(
            "relative group flex items-center p-6 md:p-8 rounded-[2.5rem] border-2 transition-all duration-300 text-left min-h-[110px] md:min-h-[130px]",
            getButtonStyles(option.id, index)
          )}
        >
          <div className={cn(
            "flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black mr-6 transition-all",
            selectedId === option.id || correctId === option.id
              ? "bg-white/20 text-white rotate-12 scale-110" 
              : "bg-black/20 text-white/90 group-hover:bg-white/20"
          )}>
            {getLetter(index)}
          </div>
          <span className="text-xl md:text-2xl font-black uppercase italic tracking-tight leading-tight">
            {option.option_text}
          </span>
          
          {/* Subtle glow effect on hover */}
          {!disabled && (
            <div className="absolute inset-0 rounded-[2.5rem] bg-white/0 group-hover:bg-white/5 transition-colors pointer-events-none" />
          )}
        </button>
      ))}
    </div>
  );
};

export default AnswerButtons;
