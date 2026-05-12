'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardEntry {
  user_id: string;
  username?: string;
  display_name?: string;
  score: number;
  rank?: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  highlightUserId?: string;
  className?: string;
  isFull?: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ 
  entries, 
  highlightUserId,
  className,
  isFull = false
}) => {
  // Sort by score and take top 5 if not full
  const sortedEntries = [...entries]
    .sort((a, b) => b.score - a.score)
    .slice(0, isFull ? undefined : 5);

  const getRankStyles = (index: number) => {
    switch (index) {
      case 0: return "bg-yellow-500/20 border-yellow-500/50 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]";
      case 1: return "bg-zinc-400/20 border-zinc-400/50 text-zinc-300";
      case 2: return "bg-orange-600/20 border-orange-600/50 text-orange-500";
      default: return "bg-white/5 border-white/10 text-zinc-500";
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-5 h-5" />;
      case 1: return <Medal className="w-5 h-5" />;
      case 2: return <Award className="w-5 h-5" />;
      default: return <span className="text-xs font-black">{index + 1}</span>;
    }
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto space-y-6", className)}>
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
            <Trophy className="text-indigo-400" size={24} />
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
            {isFull ? "Bảng điểm chung cuộc" : "Bảng xếp hạng"}
          </h2>
        </div>
        {!isFull && sortedEntries.length > 0 && (
           <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
             Top 5
           </span>
        )}
      </div>

      <div className="relative space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedEntries.map((entry, index) => (
            <motion.div
              key={entry.user_id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                layout: { duration: 0.4 } 
              }}
              className={cn(
                "flex items-center justify-between p-4 md:p-5 rounded-[1.5rem] border transition-all duration-300",
                entry.user_id === highlightUserId
                  ? "bg-indigo-600 border-indigo-400 shadow-[0_10px_30px_rgba(79,70,229,0.4)] z-10 scale-[1.02]"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              <div className="flex items-center gap-5">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all",
                  entry.user_id === highlightUserId 
                    ? "bg-white/20 border-white/30 text-white" 
                    : getRankStyles(index)
                )}>
                  {getRankIcon(index)}
                </div>
                <div className="flex flex-col">
                  <span className={cn(
                    "font-black text-lg uppercase italic tracking-tight",
                    entry.user_id === highlightUserId ? "text-white" : "text-white/90"
                  )}>
                    {entry.display_name || entry.username || "Người chơi"}
                  </span>
                  {entry.user_id === highlightUserId && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-200 opacity-80">
                      Đây là bạn
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-right flex flex-col items-end">
                <span className={cn(
                  "text-2xl font-black tabular-nums tracking-tighter italic",
                  entry.user_id === highlightUserId ? "text-white" : "text-indigo-400"
                )}>
                  {entry.score.toLocaleString()}
                </span>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  entry.user_id === highlightUserId ? "text-white/50" : "text-zinc-500"
                )}>
                  PTS
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {sortedEntries.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white/5 rounded-[2.5rem] border-2 border-dashed border-white/5"
          >
            <User className="w-12 h-12 text-zinc-700 mx-auto mb-4 opacity-20" />
            <p className="text-zinc-500 font-black uppercase italic tracking-widest text-xs">Đang cập nhật bảng điểm...</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
