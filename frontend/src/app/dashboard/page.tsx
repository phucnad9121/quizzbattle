"use client";

import Link from "next/link";
import { PlusCircle, PlaySquare, BookOpen } from "lucide-react";
import { useQuizzes } from "@/hooks/useQuizzes";
import { QuizCard } from "@/components/quiz/QuizCard";

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuizzes();

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:3s]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-16">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full mb-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Quản lý Quiz</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-white uppercase leading-none">
              Thư viện <span className="text-indigo-500">Quiz</span> của bạn
            </h1>
            <p className="text-zinc-400 font-medium max-w-md">Quản lý và tạo các bộ câu hỏi thú vị để thách đấu mọi người.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/library"
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-5 bg-white/5 hover:bg-white/10 text-white font-black uppercase italic rounded-2xl border border-white/10 backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-[0_10px_20px_rgba(255,255,255,0.05)]"
            >
              <BookOpen className="w-6 h-6 text-indigo-400" />
              <span>Thư viện chung</span>
            </Link>

            <Link
              href="/room/create"
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-5 bg-linear-to-r from-emerald-500 to-green-600 text-white font-black uppercase italic rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(16,185,129,0.3)]"
            >
              <PlaySquare className="w-6 h-6" />
              <span>Tạo Phòng</span>
            </Link>
            
            <Link
              href="/quiz/create"
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-5 bg-linear-to-r from-indigo-500 to-purple-600 text-white font-black uppercase italic rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(79,70,229,0.3)]"
            >
              <PlusCircle className="w-6 h-6" />
              <span>Tạo Quiz Mới</span>
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="rounded-[2rem] bg-white/5 border border-white/10 overflow-hidden animate-pulse">
                <div className="h-48 bg-white/5"></div>
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-white/10 rounded-lg w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-white/5 rounded-md w-full"></div>
                    <div className="h-4 bg-white/5 rounded-md w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="rounded-[2.5rem] border border-red-500/20 bg-red-500/10 backdrop-blur-md p-12 text-center mt-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 text-red-500 mb-6">
              <span className="text-2xl font-black">!</span>
            </div>
            <h3 className="text-2xl font-black text-white uppercase italic mb-2">Lỗi tải dữ liệu</h3>
            <p className="text-zinc-400">Đã có lỗi xảy ra khi tải danh sách quiz. Vui lòng thử lại sau.</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && data?.items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-white/10 bg-white/5 backdrop-blur-md p-20 text-center mt-10 group">
            <div className="bg-indigo-500/20 p-6 rounded-[2rem] mb-6 group-hover:rotate-12 transition-transform duration-500">
              <PlaySquare className="w-12 h-12 text-indigo-500" />
            </div>
            <h3 className="text-3xl font-black text-white uppercase italic mb-3">Bạn chưa có Quiz nào!</h3>
            <p className="text-zinc-400 max-w-sm mb-10 text-lg">
              Bắt đầu tạo bộ câu hỏi đầu tiên của bạn để chia sẻ và thách đấu với bạn bè ngay hôm nay.
            </p>
            <Link
              href="/quiz/create"
              className="inline-flex items-center gap-3 px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase italic rounded-2xl shadow-[0_20px_40px_rgba(79,70,229,0.4)] transition-all hover:scale-105"
            >
              <PlusCircle className="w-6 h-6" />
              Tạo Quiz đầu tiên
            </Link>
          </div>
        )}

        {/* Data Grid */}
        {!isLoading && !isError && data && data.items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {data.items.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

