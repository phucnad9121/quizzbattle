"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { useAuthStore } from "@/store/authStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, Play, Crown, LogOut, Wifi, WifiOff, ArrowLeft } from "lucide-react";

export default function LobbyPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const { user } = useAuthStore();
  const { players, status, currentQuestion, resetGame, hostId } = useGameStore();
  const { status: wsStatus, sendMessage } = useWebSocket(roomCode);
  
  const [roomInfo, setRoomInfo] = useState<{
    host_username: string;
    quiz_title: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset game state when entering lobby to avoid accidental redirects
  useEffect(() => {
    if (status === "finished") {
      resetGame();
    }
  }, [status, resetGame]);

  // Fetch initial room info
  useEffect(() => {
    const fetchRoomInfo = async () => {
      if (!roomCode) return;
      try {
        const normalizedCode = roomCode.toUpperCase();
        const res = await apiClient.get(`/rooms/${normalizedCode}`);
        setRoomInfo(res.data);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Phòng không tồn tại hoặc đã kết thúc.",
        });
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomInfo();
  }, [roomCode, router, toast]);

  // Navigate when game starts
  useEffect(() => {
    if (status === "in_progress" && currentQuestion && roomCode) {
      router.push(`/room/${roomCode.toUpperCase()}/game`);
    }
  }, [status, currentQuestion, roomCode, router]);

  const currentHostName = players.find((player) => player.user_id === hostId)?.display_name ?? roomInfo?.host_username;
  const isHost = user?.id === hostId;

  const handleStartGame = () => {
    if (!isHost) return;
    sendMessage("START_GAME");
  };

  const handleLeave = () => {
    resetGame();
    router.push("/dashboard");
  };

  if (!isMounted || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
          <p className="text-zinc-500 font-medium animate-pulse">Đang chuẩn bị phòng chờ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#020617] min-h-screen text-white p-6 relative overflow-hidden">
      {/* Fixed Back Button for Testing */}
      <div className="fixed top-6 left-6 z-50">
        <Button 
          variant="ghost" 
          onClick={handleLeave}
          className="bg-white/5 hover:bg-white/10 text-white rounded-2xl px-4 py-6 border border-white/10 backdrop-blur-md transition-all group"
        >
          <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
          Thoát
        </Button>
      </div>

      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:3s]" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 mb-12 max-w-6xl mx-auto w-full">
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full mb-3 inline-flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Lobby Realtime</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase leading-none mb-2">
            {roomInfo?.quiz_title}
          </h1>
          <div className="flex items-center gap-2 text-zinc-400 font-bold uppercase tracking-wider">
            <Crown size={20} className="text-yellow-500 fill-yellow-500" />
            <span>Chủ phòng: <span className="text-white">{currentHostName}</span></span>
          </div>
        </div>

        <div className="flex flex-col items-center p-6 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] min-w-60">
          <span className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Mã Tham Gia</span>
          <span className="text-6xl font-black font-mono tracking-[0.2em] text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]">
            {roomCode}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center max-w-6xl mx-auto w-full">
        <div className="w-full flex items-center justify-between mb-8 px-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)] rounded-2xl rotate-3">
              <Users className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase">Đấu thủ</h2>
              <p className="text-indigo-400 font-bold">{players.length} người đã sẵn sàng</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-3 px-4 py-2 rounded-full border ${wsStatus === "connected" ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {wsStatus === "connected" ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span className="text-xs font-black uppercase tracking-tighter">
              {wsStatus === "connected" ? "Máy chủ: Tốt" : "Mất kết nối"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 w-full mb-32 px-4">
          {players.map((player) => (
            <Card 
              key={player.user_id} 
              className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden hover:border-indigo-500/50 transition-all duration-300 group hover:-translate-y-2 rounded-3xl"
            >
              <CardContent className="p-8 flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-4xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-indigo-500/20 group-hover:rotate-12 transition-transform duration-300">
                    {player.display_name.charAt(0).toUpperCase()}
                  </div>
                  {player.user_id === hostId && (
                    <div className="absolute -top-2 -right-2 bg-yellow-500 p-1.5 rounded-full shadow-lg border-2 border-black">
                      <Crown size={12} className="text-black fill-black" />
                    </div>
                  )}
                </div>
                <span className="font-black text-lg text-center truncate w-full uppercase tracking-tight">
                  {player.display_name}
                </span>
              </CardContent>
            </Card>
          ))}
          
          {/* Empty slots placeholders */}
          {Array.from({ length: Math.max(0, 5 - (players.length % 5 || 5)) + 5 }).map((_, i) => (
            <div 
              key={`empty-${i}`} 
              className="border-2 border-dashed border-white/5 rounded-[2.5rem] p-8 flex items-center justify-center opacity-40"
            >
              <div className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center">
                <span className="text-white/10 font-black text-xl">?</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="fixed bottom-0 left-0 w-full p-8 z-30 pointer-events-none">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-end gap-6 pointer-events-auto">
          <Button
            variant="ghost"
            onClick={handleLeave}
            className="h-16 px-8 rounded-3xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all font-bold uppercase tracking-widest group"
          >
            <LogOut className="mr-3 group-hover:-translate-x-1 transition-transform" size={24} />
            Rời phòng
          </Button>

          {isHost ? (
            <Button
              size="lg"
              onClick={handleStartGame}
              disabled={players.length < 1}
              className="h-24 px-16 text-3xl font-black bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-[0_20px_50px_rgba(34,197,94,0.3)] border-none rounded-4xl transition-all hover:scale-105 active:scale-95 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <Play className="mr-4 fill-white relative z-10" size={32} />
              <span className="relative z-10 uppercase italic">BẮT ĐẦU</span>
            </Button>
          ) : (
            <div className="flex flex-col items-center md:items-end gap-4">
              <div className="flex items-center gap-4 px-10 py-8 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="relative">
                  <Loader2 className="animate-spin text-indigo-500" size={32} />
                  <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                </div>
                <span className="text-2xl font-black italic uppercase tracking-wider text-white">
                  Đợi host khai hỏa...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
