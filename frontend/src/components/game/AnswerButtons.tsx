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

  const getButtonStyles = (optionId: string) => {
    const isSelected = selectedId === optionId;
    const isCorrect = (correctId === optionId) || (answerResult?.is_correct && isSelected);
    const isWrong = isSelected && ((correctId && correctId !== optionId) || (answerResult && answerResult.is_correct === false));

    if (isCorrect) {
      return "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105 z-10";
    }
    if (isWrong) {
      return "bg-rose-500 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] opacity-90";
    }
    if (isSelected) {
      return "bg-indigo-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] scale-105 z-10";
    }

    return "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/90";
  };

  const getLetter = (index: number) => String.fromCharCode(65 + index);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mx-auto">
      {options.map((option, index) => (
        <button
          key={option.id}
          disabled={disabled}
          onClick={() => onSelect(option.id)}
          className={cn(
            "relative group flex items-center p-6 rounded-[2rem] border-2 transition-all duration-300 text-left min-h-[100px]",
            getButtonStyles(option.id),
            disabled && !selectedId && !correctId && "opacity-50 grayscale cursor-not-allowed"
          )}
        >
          <div className={cn(
            "flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black mr-4 transition-colors",
            selectedId === option.id || correctId === option.id || (answerResult?.is_correct && selectedId === option.id)
              ? "bg-white/20 text-white" 
              : "bg-white/10 text-indigo-300 group-hover:bg-indigo-500 group-hover:text-white"
          )}>
            {getLetter(index)}
          </div>
          <span className="text-lg md:text-xl font-bold">{option.option_text}</span>
          
          {/* Subtle glow effect on hover */}
          {!disabled && (
            <div className="absolute inset-0 rounded-[2rem] bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors pointer-events-none" />
          )}
        </button>
      ))}
    </div>
  );
};

export default AnswerButtons;
