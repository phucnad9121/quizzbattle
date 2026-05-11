'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  score: number;
  rank?: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  highlightUserId?: string;
  className?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ 
  entries, 
  highlightUserId,
  className 
}) => {
  const sortedEntries = [...entries].sort((a, b) => b.score - a.score);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="text-yellow-400 w-6 h-6" />;
      case 1: return <Medal className="text-zinc-300 w-6 h-6" />;
      case 2: return <Award className="text-orange-400 w-6 h-6" />;
      default: return <span className="text-zinc-500 font-bold w-6 text-center">{index + 1}</span>;
    }
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto space-y-4", className)}>
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="text-yellow-500" size={32} />
        <h2 className="text-3xl font-black italic uppercase tracking-tight">Bảng xếp hạng</h2>
      </div>

      <div className="space-y-3">
        {sortedEntries.map((entry, index) => (
          <div
            key={entry.user_id}
            className={cn(
              "flex items-center justify-between p-5 rounded-2xl transition-all duration-300 border",
              entry.user_id === highlightUserId
                ? "bg-indigo-600/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10 scale-[1.02]"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            )}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {getRankIcon(index)}
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "font-bold text-lg",
                  entry.user_id === highlightUserId ? "text-indigo-300" : "text-white"
                )}>
                  {entry.display_name}
                  {entry.user_id === highlightUserId && " (Bạn)"}
                </span>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-2xl font-black tabular-nums text-white">
                {entry.score.toLocaleString()}
              </span>
              <span className="text-[10px] block font-bold text-zinc-500 uppercase tracking-widest">
                Điểm
              </span>
            </div>
          </div>
        ))}

        {sortedEntries.length === 0 && (
          <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <p className="text-zinc-500 font-medium italic">Chưa có dữ liệu xếp hạng...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
