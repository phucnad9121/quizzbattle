"use client";

import { useEffect, useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useGameStore } from "@/store/gameStore";
import Leaderboard from "@/components/game/Leaderboard";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, RotateCcw, LayoutDashboard, Target, Zap, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useAuthStore } from "@/store/authStore";

interface ParticipantResult {
  user_id: string;
  display_name: string;
  score: number;
  rank: number;
  correct_answers: number;
}

interface GameResultsData {
  quiz_id: string;
  host_id: string;
  total_questions: number;
  participants: ParticipantResult[];
}

export default function ResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const { resetGame } = useGameStore();
  const [data, setData] = useState<GameResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/rooms/${sessionId}/results`);
        setData(response.data);
        
        // Trigger confetti for top 3
        const myResult = response.data.participants.find((p: ParticipantResult) => p.user_id === user?.id);
        if (myResult && myResult.rank <= 3) {
          triggerConfetti();
        }
      } catch (err: any) {
        console.error("Failed to fetch results:", err);
        if (err.response?.status === 404) {
          router.push("/dashboard");
        } else {
          setError("Không thể tải kết quả trận đấu. Vui lòng thử lại sau.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      fetchResults();
    }
  }, [sessionId, user?.id, router]);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#6366f1', '#a855f7', '#ec4899']
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#6366f1', '#a855f7', '#ec4899']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleRestart = async () => {
    if (!data) return;
    try {
      setIsRestarting(true);
      const response = await apiClient.post("/rooms", {
        quiz_id: data.quiz_id
      });
      resetGame();
      router.push(`/room/${response.data.room_code}/lobby`);
    } catch (err) {
      console.error("Failed to restart game:", err);
      setIsRestarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-500" />
          <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Đang tổng hợp dữ liệu...</p>
        </div>
      </div>
    );
  }

  const myResult = data?.participants.find(p => p.user_id === user?.id);
  const isHost = user?.id === data?.host_id;
  const accuracy = data?.total_questions ? Math.round((myResult?.correct_answers || 0) / data.total_questions * 100) : 0;

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12 px-4 relative overflow-hidden font-sans">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-indigo-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-purple-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <button 
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center text-xs font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-indigo-400 transition-all group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
              Quay lại Dashboard
            </button>
            <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-[0.9]">
              BẢNG <br /> <span className="text-indigo-500 text-7xl md:text-9xl drop-shadow-[0_0_30px_rgba(79,70,229,0.3)]">VÀNG</span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button 
              variant="outline" 
              onClick={() => router.push("/dashboard")}
              className="h-16 px-8 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white font-black uppercase italic transition-all flex items-center gap-3"
            >
              <LayoutDashboard size={20} />
              Trang chủ
            </Button>
            
            {isHost && (
              <Button 
                onClick={handleRestart}
                disabled={isRestarting}
                className="h-16 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase italic shadow-[0_20px_40px_rgba(79,70,229,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
              >
                {isRestarting ? <Loader2 className="animate-spin" /> : <RotateCcw size={20} />}
                Chơi lại
              </Button>
            )}
          </div>
        </div>

        {/* Personal Stats Grid */}
        {myResult && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex items-center gap-6 group hover:bg-white/10 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Trophy size={32} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Hạng của bạn</span>
                <div className="text-3xl font-black italic uppercase tracking-tight text-white">#{myResult.rank}</div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex items-center gap-6 group hover:bg-white/10 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Target size={32} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Độ chính xác</span>
                <div className="text-3xl font-black italic uppercase tracking-tight text-white">{accuracy}%</div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex items-center gap-6 group hover:bg-white/10 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Zap size={32} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Số câu đúng</span>
                <div className="text-3xl font-black italic uppercase tracking-tight text-white">
                  {myResult.correct_answers} / {data?.total_questions}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Leaderboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-12 pt-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden"
          >
            {/* Glossy overlay */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            
            <Leaderboard 
              entries={data?.participants || []} 
              highlightUserId={user?.id} 
              isFull 
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
