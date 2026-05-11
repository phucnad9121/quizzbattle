"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import QRCode from "qrcode.react";
import { 
  Loader2, 
  PlusCircle, 
  ArrowLeft, 
  Copy, 
  Play, 
  QrCode as QrIcon, 
  Sparkles,
  Trophy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

type QuizItem = {
  id: string;
  title: string;
  question_count: number;
};

export default function CreateRoomPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { accessToken } = useAuthStore();
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchQuizzes = async () => {
      try {
        const res = await apiClient.get("/quizzes");
        if (!mounted) return;
        const items = res.data.items ?? [];
        setQuizzes(items);
        if (items.length > 0) setSelectedQuiz(items[0].id);
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không thể tải danh sách bộ câu hỏi.",
        });
      }
    };
    fetchQuizzes();
    return () => {
      mounted = false;
    };
  }, [accessToken, toast]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;
    setLoading(true);
    try {
      const res = await apiClient.post("/rooms", { quiz_id: selectedQuiz });
      const code = res.data.room_code || res.data.roomCode || null;
      setRoomCode(code);
      toast({
        title: "Thành công!",
        description: "Phòng chơi đã được khởi tạo.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Thất bại",
        description: err?.response?.data?.detail || "Không thể tạo phòng lúc này.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Đã sao chép mã phòng!" });
    } catch {
      toast({ variant: "destructive", title: "Lỗi sao chép" });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Fixed Back Button for Testing */}
      <div className="fixed top-6 left-6 z-50">
        <Button 
          variant="ghost" 
          onClick={() => router.push("/dashboard")}
          className="bg-white/5 hover:bg-white/10 text-white rounded-2xl px-4 py-6 border border-white/10 backdrop-blur-md transition-all group"
        >
          <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
          Trang chủ
        </Button>
      </div>

      {/* Background Decorative Elements - Improved Depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:3s]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center mb-8">
           <div className="p-4 bg-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] rounded-3xl rotate-6 mb-6">
              <PlusCircle size={40} className="text-white" />
           </div>
           <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-center leading-none">
             Khởi Tạo <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Đấu Trường</span>
           </h1>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-2xl rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]">
          <CardContent className="p-8 md:p-12">
            {!roomCode ? (
              <form onSubmit={handleCreate} className="space-y-8">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                    <Trophy size={14} className="text-indigo-400" />
                    Chọn Bộ Câu Hỏi
                  </label>
                  <div className="relative group">
                    <select
                      className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-5 text-lg font-bold appearance-none focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
                      value={selectedQuiz ?? ""}
                      onChange={(e) => setSelectedQuiz(e.target.value)}
                    >
                      {quizzes.map((q) => (
                        <option key={q.id} value={q.id} className="bg-slate-900 text-white p-4">
                          {q.title} — ({q.question_count} câu)
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                      <Sparkles size={20} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Button
                    type="submit"
                    disabled={loading || !selectedQuiz}
                    className="w-full h-16 text-xl font-black uppercase italic bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-[0_15px_30px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.02] active:scale-95"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      <Play className="mr-2 fill-white" />
                    )}
                    {loading ? "Đang Khởi Tạo..." : "Tạo Phòng Ngay"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push("/dashboard")}
                    className="w-full sm:w-auto h-16 px-8 text-zinc-400 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest rounded-2xl"
                  >
                    <ArrowLeft className="mr-2" size={18} />
                    Quay lại
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-10 animate-in zoom-in-95 duration-500">
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Phòng đã sẵn sàng</span>
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <div 
                      onClick={handleCopy}
                      className="group cursor-pointer bg-black/40 border-2 border-dashed border-indigo-500/30 p-6 rounded-[2.5rem] flex flex-col items-center hover:border-indigo-500 hover:bg-indigo-500/5 transition-all"
                    >
                      <span className="text-6xl font-black font-mono tracking-[0.1em] text-white">
                        {roomCode}
                      </span>
                      <div className="mt-3 flex items-center gap-2 text-zinc-500 group-hover:text-indigo-300 transition-colors">
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {copied ? "Đã chép" : "Nhấn để chép mã"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8 bg-black/20 p-8 rounded-[2rem] border border-white/5">
                  <div className="bg-white p-3 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                    <QRCode value={roomCode} size={140} renderAs="svg" />
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-300">
                      <QrIcon size={20} />
                      <span className="font-black uppercase tracking-widest text-xs">Quét để tham gia</span>
                    </div>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                      Gửi mã này cho bạn bè hoặc yêu cầu họ quét mã QR để tham gia trận đấu ngay lập tức.
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={() => router.push(`/room/${roomCode}/lobby`)}
                  className="w-full h-20 text-2xl font-black uppercase italic bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-3xl shadow-[0_20px_40px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] active:scale-95 group"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Vào Phòng Chờ
                    <ArrowLeft className="rotate-180 group-hover:translate-x-2 transition-transform" />
                  </span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center mt-12 text-zinc-600 font-bold uppercase tracking-[0.2em] text-[10px]">
          QuizzBattle Engine v1.0 • Chúc bạn có những giây phút kịch tính
        </p>
      </div>
    </div>
  );
}
