"use client";

import Link from "next/link";
import { PlusCircle, PlaySquare } from "lucide-react";
import { useQuizzes } from "@/hooks/useQuizzes";
import { QuizCard } from "@/components/quiz/QuizCard";

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuizzes();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Thư viện Quiz của bạn</h1>
            <p className="text-slate-500 mt-1">Quản lý và tạo các bộ câu hỏi thú vị để thách đấu mọi người.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/room/create"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all shadow-[0_0_18px_rgba(16,185,129,0.35)] hover:shadow-[0_0_22px_rgba(16,185,129,0.55)] active:scale-95"
            >
              <PlaySquare className="w-5 h-5" />
              Tạo Phòng
            </Link>
            <Link
              href="/room/join"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all active:scale-95"
            >
              Vào Phòng
            </Link>
            <Link
              href="/quiz/create"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-95"
            >
              <PlusCircle className="w-5 h-5" />
              Tạo Quiz Mới
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm animate-pulse">
                <div className="h-40 bg-slate-200"></div>
                <div className="p-5">
                  <div className="h-5 bg-slate-200 rounded-md w-3/4 mb-3"></div>
                  <div className="h-4 bg-slate-100 rounded-md w-full mb-2"></div>
                  <div className="h-4 bg-slate-100 rounded-md w-2/3 mb-6"></div>
                  <div className="flex justify-between border-t border-slate-100 pt-4">
                    <div className="h-6 bg-slate-100 rounded w-20"></div>
                    <div className="h-4 bg-slate-100 rounded w-16 mt-1"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center mt-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-500 mb-4">
              <span className="text-xl font-bold">!</span>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Lỗi tải dữ liệu</h3>
            <p className="text-red-600">Đã có lỗi xảy ra khi tải danh sách quiz. Vui lòng thử lại sau.</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && data?.items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/50 backdrop-blur-sm p-16 text-center mt-10">
            <div className="bg-indigo-50 p-4 rounded-full mb-5">
              <PlaySquare className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Bạn chưa có Quiz nào!</h3>
            <p className="text-slate-500 max-w-sm mb-8">
              Bắt đầu tạo bộ câu hỏi đầu tiên của bạn để chia sẻ và thách đấu với bạn bè ngay hôm nay.
            </p>
            <Link
              href="/quiz/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              Tạo Quiz đầu tiên
            </Link>
          </div>
        )}

        {/* Data Grid */}
        {!isLoading && !isError && data && data.items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.items.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
