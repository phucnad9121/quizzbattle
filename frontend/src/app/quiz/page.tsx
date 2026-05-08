"use client";
// UI Sync triggered.

import Link from "next/link";
import { PlusCircle, PlaySquare } from "lucide-react";
import { useQuizzes } from "@/hooks/useQuizzes";
import { QuizCard } from "@/components/quiz/QuizCard";

export default function Page() {
  const { data, isLoading, isError } = useQuizzes();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bộ sưu tập của tôi</h1>
          <p className="text-muted-foreground mt-1">Danh sách tất cả các bộ câu hỏi bạn đã tạo.</p>
        </div>
        <Link
          href="/quiz/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-all shadow-sm"
        >
          <PlusCircle className="w-5 h-5" />
          Tạo mới
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="p-8 text-center border rounded-xl bg-destructive/5 text-destructive">
          Đã có lỗi xảy ra khi tải danh sách.
        </div>
      )}

      {!isLoading && !isError && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl bg-muted/30">
          <PlaySquare className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Chưa có quiz nào</h3>
          <p className="text-muted-foreground mb-6">Hãy tạo bộ câu hỏi đầu tiên của bạn!</p>
          <Link href="/quiz/create">
            <PlusCircle className="w-5 h-5 inline mr-2" />
            Tạo ngay
          </Link>
        </div>
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.items.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </div>
  );
}
