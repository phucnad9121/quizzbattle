'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Zap, Star } from "lucide-react";

interface ResultOverlayProps {
  isCorrect: boolean;
  scoreEarned: number;
  answerTimeMs: number;
  correctAnswer?: string;
  isVisible: boolean;
  className?: string;
}

const ResultOverlay: React.FC<ResultOverlayProps> = ({
  isCorrect,
  scoreEarned,
  answerTimeMs,
  correctAnswer,
  isVisible,
  className
}) => {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-300",
      className
    )}>
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div className={cn(
        "relative transform transition-all duration-500 animate-in zoom-in-95 slide-in-from-bottom-10",
        "w-[90%] max-w-md p-8 rounded-[3rem] text-center shadow-2xl overflow-hidden",
        isCorrect 
          ? "bg-emerald-500 border-4 border-emerald-400" 
          : "bg-rose-500 border-4 border-rose-400"
      )}>
        {/* Shine effect */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
        
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            {isCorrect ? (
              <div className="relative">
                <CheckCircle2 className="w-24 h-24 text-white animate-bounce" />
                <Star className="absolute -top-2 -right-2 w-8 h-8 text-yellow-300 fill-yellow-300" />
              </div>
            ) : (
              <XCircle className="w-24 h-24 text-white animate-pulse" />
            )}
          </div>

          <div>
            <h3 className="text-4xl font-black italic uppercase tracking-tighter text-white mb-2">
              {isCorrect ? "CHÍNH XÁC!" : "TIẾC QUÁ!"}
            </h3>
            <p className="text-white/80 font-bold uppercase tracking-widest text-sm">
              {isCorrect ? "Bạn thật xuất sắc" : "Cố gắng ở câu sau nhé"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-black/20 rounded-2xl p-4 flex flex-col items-center justify-center">
              <Zap className="w-6 h-6 text-yellow-300 mb-1" />
              <span className="text-2xl font-black text-white">+{scoreEarned}</span>
              <span className="text-[10px] font-bold text-white/60 uppercase">Điểm</span>
            </div>
            <div className="bg-black/20 rounded-2xl p-4 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-white">{(answerTimeMs / 1000).toFixed(2)}s</span>
              <span className="text-[10px] font-bold text-white/60 uppercase">Tốc độ</span>
            </div>
          </div>

          {!isCorrect && correctAnswer && (
            <div className="mt-4 w-full text-left">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Đáp án đúng là:</span>
              <div className="mt-1 p-4 bg-white/10 rounded-2xl text-white font-bold text-lg">
                {correctAnswer}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultOverlay;
