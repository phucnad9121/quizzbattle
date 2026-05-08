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
      className="group block overflow-hidden rounded-2xl bg-white/50 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
    >
      {/* Cover Image Placeholder */}
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        {quiz.cover_url ? (
          <img
            src={quiz.cover_url}
            alt={quiz.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <span className="text-4xl font-bold text-white/30 uppercase tracking-wider">
              {quiz.title.slice(0, 2)}
            </span>
          </div>
        )}
        
        {/* Badge */}
        <div className="absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md shadow-sm border border-white/10 flex items-center gap-1.5 transition-colors duration-300
          ${quiz.is_public ? 'bg-emerald-500/80 text-white' : 'bg-slate-800/80 text-white'}"
          style={{ backgroundColor: quiz.is_public ? "rgba(16, 185, 129, 0.85)" : "rgba(30, 41, 59, 0.85)" }}
        >
          {quiz.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          {quiz.is_public ? "Public" : "Private"}
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-lg text-slate-800 line-clamp-1 mb-2 group-hover:text-indigo-600 transition-colors">
          {quiz.title}
        </h3>
        
        <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px] mb-4">
          {quiz.description || "Chưa có mô tả nào cho bộ câu hỏi này."}
        </p>

        <div className="flex items-center justify-between text-xs font-medium text-slate-500 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-md">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
            <span>{quiz.question_count} câu hỏi</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
