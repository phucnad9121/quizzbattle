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
              <div className="relative animate-in zoom-in duration-500">
                <CheckCircle2 className="w-24 h-24 text-white" />
                <Star className="absolute -top-2 -right-2 w-10 h-10 text-yellow-300 fill-yellow-300 animate-pulse" />
              </div>
            ) : (
              <div className="animate-in zoom-in duration-500">
                <XCircle className="w-24 h-24 text-white" />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-5xl font-black italic uppercase tracking-tighter text-white mb-2 drop-shadow-lg">
              {isCorrect ? "TUYỆT VỜI!" : "TIẾC QUÁ!"}
            </h3>
            <p className="text-white/90 font-black uppercase tracking-widest text-xs">
              {isCorrect ? "Bạn đang dẫn đầu!" : "Đừng bỏ cuộc nhé!"}
            </p>
          </div>

          <div className="flex items-center gap-4 w-full">
            <div className="flex-1 bg-black/30 backdrop-blur-md rounded-3xl p-5 flex flex-col items-center justify-center border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                <span className="text-3xl font-black text-white">+{scoreEarned}</span>
              </div>
              <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Điểm kiếm được</span>
            </div>
          </div>

          {correctAnswer && (
            <div className="w-full space-y-2">
              <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Đáp án chính xác</span>
              <div className="p-5 bg-white/20 backdrop-blur-xl rounded-[1.5rem] border border-white/20 text-white font-black text-xl italic uppercase tracking-tight">
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
