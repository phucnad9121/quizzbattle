'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { Timer } from "lucide-react";

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

  return (
    <div className={cn("w-full max-w-md mx-auto p-4 rounded-2xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-white/20 dark:border-gray-800 shadow-xl", className)}>
      <div className="flex justify-between items-end mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-lg", colors.bg)}>
            <Timer className={cn("w-5 h-5", colors.text)} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Thời gian</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Nhanh lên nào!</span>
          </div>
        </div>
        
        <div className="text-right">
          <span className={cn(
            "text-4xl font-black tabular-nums tracking-tighter transition-all duration-300",
            colors.text,
            percentage < 15 ? "animate-pulse scale-110" : ""
          )}>
            {Math.ceil(timeLeft)}
          </span>
          <span className="text-xs font-bold text-gray-400 ml-1">GIÂY</span>
        </div>
      </div>

      <div className="relative h-3 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden p-[0.5px]">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(0,0,0,0.1)]", 
            colors.bar
          )}
          style={{ width: `${percentage}%` }}
        />
        {/* Glossy overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      </div>
      
      {/* Decorative dots for a more premium look */}
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
    </div>
  );
};

export default CountdownTimer;
