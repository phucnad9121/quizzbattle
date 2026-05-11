"use client";
// UI Sync triggered.

import Link from "next/link";
import { PlusCircle, PlaySquare } from "lucide-react";
import { useQuizzes } from "@/hooks/useQuizzes";
import { QuizCard } from "@/components/quiz/QuizCard";

export default function Page() {
  const { data, isLoading, isError } = useQuizzes();

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:3s]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full mb-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Bộ sưu tập</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-white uppercase leading-none">
              Kho <span className="text-indigo-500">Bí Kíp</span> của tôi
            </h1>
            <p className="text-zinc-400 font-medium max-w-md">Danh sách tất cả các bộ câu hỏi bạn đã tạo.</p>
          </div>
          <Link
            href="/quiz/create"
            className="inline-flex items-center justify-center gap-3 px-8 py-5 bg-linear-to-r from-indigo-500 to-purple-600 text-white font-black uppercase italic rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(79,70,229,0.3)]"
          >
            <PlusCircle className="w-6 h-6" />
            <span>Tạo Quiz Mới</span>
          </Link>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-[2rem] bg-white/5 border border-white/10 animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-[2.5rem] border border-red-500/20 bg-red-500/10 backdrop-blur-md p-12 text-center">
            <h3 className="text-2xl font-black text-white uppercase italic mb-2">Lỗi tải dữ liệu</h3>
            <p className="text-zinc-400">Đã có lỗi xảy ra khi tải danh sách. Vui lòng thử lại sau.</p>
          </div>
        )}

        {!isLoading && !isError && data?.items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-white/10 bg-white/5 backdrop-blur-md p-20 text-center group">
            <PlaySquare className="w-16 h-16 text-indigo-500 mb-6 group-hover:rotate-12 transition-transform duration-500" />
            <h3 className="text-3xl font-black text-white uppercase italic mb-3">Chưa có quiz nào</h3>
            <p className="text-zinc-400 mb-10 text-lg">Hãy tạo bộ câu hỏi đầu tiên của bạn!</p>
            <Link 
              href="/quiz/create"
              className="inline-flex items-center gap-3 px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase italic rounded-2xl shadow-[0_20px_40px_rgba(79,70,229,0.4)] transition-all hover:scale-105"
            >
              <PlusCircle className="w-6 h-6" />
              Tạo ngay
            </Link>
          </div>
        )}

        {!isLoading && !isError && data && data.items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.items.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        )}
      </div>
    </div>

  );
}
