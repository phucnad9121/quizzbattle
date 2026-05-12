"use client";

import { useState } from "react";
import { QuizResponse } from "@/types/quiz";
import { Calendar, HelpCircle, Globe, Copy, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface PublicQuizCardProps {
  quiz: QuizResponse;
}

export function PublicQuizCard({ quiz }: PublicQuizCardProps) {
  const [isForking, setIsForking] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const formattedDate = new Date(quiz.created_at).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handleFork = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setIsForking(true);
      const res = await apiClient.post(`/quizzes/${quiz.id}/fork`);
      toast({
        title: "Thành công!",
        description: "Đã sao chép bộ câu hỏi về tài khoản của bạn.",
      });
      router.push(`/dashboard`); // Or to the editor: `/quiz/${res.data.id}/questions`
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể fork bộ câu hỏi này. Vui lòng đăng nhập.",
      });
    } finally {
      setIsForking(false);
    }
  };

  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setIsForking(true);
      // Automatically fork (or get existing fork) before playing
      const res = await apiClient.post(`/quizzes/${quiz.id}/fork`);
      const myQuizId = res.data.id;
      router.push(`/room/create?quizId=${myQuizId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng đăng nhập để chơi bộ câu hỏi này.",
      });
    } finally {
      setIsForking(false);
    }
  };

  return (
    <div
      className="group block overflow-hidden rounded-[2.5rem] bg-slate-900/40 backdrop-blur-xl border border-white/10 hover:border-indigo-500/50 transition-all duration-500 hover:-translate-y-2 shadow-2xl relative"
    >
      {/* Cover Image */}
      <div className="relative h-52 w-full overflow-hidden bg-linear-to-br from-indigo-500 via-purple-600 to-pink-500">
        {quiz.cover_url ? (
          <img
            src={quiz.cover_url}
            alt={quiz.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="text-6xl font-black text-white/10 uppercase tracking-widest italic">
              {quiz.title.slice(0, 2)}
            </span>
          </div>
        )}
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
            <Button 
                onClick={handlePlay}
                disabled={isForking}
                className="bg-white text-black hover:bg-white/90 rounded-2xl px-6 font-black uppercase italic tracking-tight shadow-xl"
            >
                {isForking ? (
                  <Loader2 className="mr-2 animate-spin" size={18} />
                ) : (
                  <Play className="mr-2 fill-black" size={18} />
                )}
                Chơi ngay
            </Button>
        </div>

        {/* Badge */}
        <div className="absolute top-4 right-4 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 backdrop-blur-xl border border-emerald-500/20 flex items-center gap-2 shadow-lg">
          <Globe className="w-3 h-3" />
          Công khai
        </div>
      </div>

      <div className="p-7">
        <h3 className="font-black text-2xl text-white uppercase italic tracking-tight line-clamp-1 mb-2 group-hover:text-indigo-400 transition-colors">
          {quiz.title}
        </h3>
        
        <p className="text-sm text-zinc-400 font-medium line-clamp-2 min-h-[40px] mb-8">
          {quiz.description || "Chưa có mô tả nào cho bộ câu hỏi này."}
        </p>

        <div className="flex items-center justify-between pt-6 border-t border-white/5">
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-black text-indigo-400 uppercase tracking-tighter">{quiz.question_count} CÂU HỎI</span>
             </div>
             <div className="flex items-center gap-2 text-zinc-500">
                <Calendar className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-tight opacity-60">{formattedDate}</span>
             </div>
          </div>
          
          <Button
            size="sm"
            onClick={handleFork}
            disabled={isForking}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl px-4 py-5 font-black uppercase italic text-xs transition-all flex items-center gap-2"
          >
            {isForking ? <Loader2 className="animate-spin" size={14} /> : <Copy size={14} />}
            Fork
          </Button>
        </div>
      </div>
    </div>
  );
}
