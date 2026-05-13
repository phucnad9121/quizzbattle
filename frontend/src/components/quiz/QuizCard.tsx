import Link from "next/link";
import { QuizResponse } from "@/types/quiz";
import { Calendar, HelpCircle, Lock, Globe } from "lucide-react";

interface QuizCardProps {
  quiz: QuizResponse;
}

export function QuizCard({ quiz }: QuizCardProps) {
  const formattedDate = new Date(quiz.created_at).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/quiz/${quiz.id}/questions`}
      className="group block overflow-hidden rounded-2xl md:rounded-[2rem] bg-white/5 backdrop-blur-md border border-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-2 shadow-2xl"
    >
      {/* Cover Image Placeholder */}
      <div className="relative h-28 md:h-48 w-full overflow-hidden bg-linear-to-br from-indigo-500 via-purple-600 to-pink-500">
        {quiz.cover_url ? (
          <img
            src={quiz.cover_url}
            alt={quiz.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="text-3xl md:text-5xl font-black text-white/20 uppercase tracking-widest italic">
              {quiz.title.slice(0, 2)}
            </span>
          </div>
        )}
        
        {/* Badge */}
        <div className="absolute top-2 right-2 md:top-4 md:right-4 rounded-full px-2 md:px-4 py-1 text-[8px] md:text-[10px] font-black uppercase tracking-widest backdrop-blur-xl border border-white/20 flex items-center gap-1 md:gap-2 transition-all duration-300 shadow-lg
          ${quiz.is_public ? 'bg-emerald-500/30 text-emerald-400' : 'bg-zinc-800/50 text-zinc-400'}"
        >
          {quiz.is_public ? <Globe className="w-2 h-2 md:w-3 md:h-3" /> : <Lock className="w-2 h-2 md:w-3 md:h-3" />}
          {quiz.is_public ? "Công khai" : "Riêng tư"}
        </div>
      </div>

      <div className="p-3 md:p-6">
        <h3 className="font-black text-sm md:text-xl text-white uppercase italic tracking-tight line-clamp-1 mb-1 md:mb-2 group-hover:text-indigo-400 transition-colors">
          {quiz.title}
        </h3>
        
        <p className="text-[10px] md:text-sm text-zinc-400 font-medium line-clamp-1 md:line-clamp-2 min-h-[15px] md:min-h-[40px] mb-3 md:mb-6">
          {quiz.description || "Chưa có mô tả..."}
        </p>

        <div className="flex items-center justify-between pt-3 md:pt-5 border-t border-white/5">
          <div className="flex items-center gap-1.5 bg-white/5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl border border-white/5">
            <HelpCircle className="w-3 h-3 md:w-4 md:h-4 text-indigo-400" />
            <span className="text-[8px] md:text-xs font-black text-indigo-400 uppercase tracking-tighter">{quiz.question_count} CÂU</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-zinc-500">
            <Calendar className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-tight">{formattedDate}</span>
          </div>
        </div>
      </div>
    </Link>

  );
}
