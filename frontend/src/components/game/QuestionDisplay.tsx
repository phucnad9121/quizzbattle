'use client';

import React from 'react';
import { cn } from "@/lib/utils";

interface QuestionDisplayProps {
  questionText: string;
  currentIndex: number;
  totalQuestions: number;
  image?: string;
  className?: string;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ 
  questionText, 
  currentIndex,
  totalQuestions,
  image,
  className 
}) => {
  return (
    <div className={cn("w-full flex flex-col items-center text-center space-y-6", className)}>
      {image && (
        <div className="relative w-full max-w-2xl h-64 md:h-80 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
          <img 
            src={image} 
            alt="Question" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}
      
      <div className="relative px-8 py-10 bg-white/10 backdrop-blur-md rounded-[2.5rem] border border-white/20 shadow-2xl max-w-4xl w-full">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1 bg-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg border border-white/20">
          Câu {currentIndex + 1}/{totalQuestions}
        </div>
        <h2 className="text-2xl md:text-4xl font-black leading-tight text-white drop-shadow-sm">
          {questionText}
        </h2>
      </div>
    </div>
  );
};

export default QuestionDisplay;
