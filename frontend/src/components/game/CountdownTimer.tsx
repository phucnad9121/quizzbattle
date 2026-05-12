'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { Timer } from "lucide-react";
import { useSound } from "@/hooks/useSound";

interface CountdownTimerProps {
  totalSeconds: number;
  onExpire?: () => void;
  className?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
  totalSeconds, 
  onExpire,
  className 
}) => {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const { playSound } = useSound();
  const lastSecondBeeped = useRef<number>(-1);
  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(null);

  useEffect(() => {
    // Luôn reset timeLeft khi totalSeconds thay đổi
    setTimeLeft(totalSeconds);
    
    const startTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;
      const remaining = Math.max(0, totalSeconds - elapsed);
      
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 100); // Cập nhật mỗi 100ms để mượt mà

    return () => clearInterval(interval);
  }, [totalSeconds]); // Chỉ chạy lại khi thời gian tổng thay đổi, không phụ thuộc vào onExpire

  useEffect(() => {
    const currentSecond = Math.ceil(timeLeft);
    if (currentSecond <= 5 && currentSecond > 0 && currentSecond !== lastSecondBeeped.current) {
      playSound("countdown");
      lastSecondBeeped.current = currentSecond;
    }
  }, [timeLeft, playSound]);

  const percentage = (timeLeft / totalSeconds) * 100;
  
  // Color logic for the progress bar and text
  const getColors = () => {
    if (percentage <= 15) return {
      bar: "bg-gradient-to-r from-red-500 to-rose-600",
      text: "text-rose-500",
      bg: "bg-rose-100 dark:bg-rose-900/20"
    };
    if (percentage <= 30) return {
      bar: "bg-gradient-to-r from-amber-400 to-orange-500",
      text: "text-amber-500",
      bg: "bg-amber-100 dark:bg-amber-900/20"
    };
    return {
      bar: "bg-gradient-to-r from-emerald-400 to-cyan-500",
      text: "text-emerald-500",
      bg: "bg-emerald-100 dark:bg-emerald-900/20"
    };
  };

  const colors = getColors();
  const isCompact = className?.includes('p-0');

  return (
    <div className={cn("w-full max-w-md mx-auto p-4 rounded-2xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-white/20 dark:border-gray-800 shadow-xl", className)}>
      <div className={cn("flex justify-between items-end", isCompact ? "mb-1" : "mb-3")}>
        <div className="flex items-center gap-2">
          {!isCompact && (
            <div className={cn("p-2 rounded-lg", colors.bg)}>
              <Timer className={cn("w-5 h-5", colors.text)} />
            </div>
          )}
          <div className="flex flex-col">
            <span className={cn("font-bold uppercase tracking-widest text-gray-400", isCompact ? "text-[8px]" : "text-[10px]")}>Thời gian</span>
            {!isCompact && <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Nhanh lên nào!</span>}
          </div>
        </div>
        
        <div className="text-right">
          <span className={cn(
            "font-black tabular-nums tracking-tighter transition-all duration-300",
            colors.text,
            isCompact ? "text-2xl" : "text-4xl",
            percentage < 15 ? "animate-pulse scale-110" : ""
          )}>
            {Math.ceil(timeLeft)}
          </span>
          <span className={cn("font-bold text-gray-400 ml-1", isCompact ? "text-[8px]" : "text-xs")}>S</span>
        </div>
      </div>

      <div className={cn("relative w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden p-[0.5px]", isCompact ? "h-2" : "h-3")}>
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(0,0,0,0.1)]", 
            colors.bar
          )}
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      </div>
      
      {!isCompact && (
        <div className="flex justify-between px-1 pt-1">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "w-1 h-1 rounded-full transition-colors duration-500",
                (i + 1) * 20 <= percentage ? "bg-gray-400" : "bg-gray-200 dark:bg-gray-700"
              )} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CountdownTimer;
