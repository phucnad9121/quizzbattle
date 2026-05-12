"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { PublicQuizCard } from "@/components/quiz/PublicQuizCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, BookOpen, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const size = 12;

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["quizzes", "public", search, page],
    queryFn: async () => {
      const res = await apiClient.get("/quizzes/public", {
        params: { search, page, size },
      });
      return res.data;
    },
  });

  const totalPages = data ? Math.ceil(data.total / size) : 0;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-16">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full mb-4">
              <Sparkles className="text-indigo-400" size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Khám phá cộng đồng</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-white mb-4 leading-none">
              Thư viện <span className="text-indigo-500">Quiz</span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-lg font-medium">
              Tìm kiếm và nhân bản hàng ngàn bộ câu hỏi chất lượng từ cộng đồng QuizzBattle.
            </p>
          </div>

          <div className="w-full md:w-96">
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl group-focus-within:bg-indigo-500/40 transition-all rounded-3xl" />
              <div className="relative flex items-center">
                <Search className="absolute left-5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                <Input
                  placeholder="Tìm kiếm bộ câu hỏi..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-16 pl-14 pr-6 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 focus-visible:bg-white/10 transition-all text-lg font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="h-[400px] flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            <p className="text-zinc-500 font-black uppercase tracking-widest animate-pulse">Đang lục tìm kho báu...</p>
          </div>
        ) : data?.items.length === 0 ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-xl">
             <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                <BookOpen size={40} className="text-zinc-600" />
             </div>
             <h3 className="text-3xl font-black uppercase italic mb-2">Không tìm thấy kết quả</h3>
             <p className="text-zinc-500 max-w-sm">
                Không tìm thấy bộ câu hỏi nào khớp với từ khóa "{search}". Hãy thử từ khóa khác xem sao!
             </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              <AnimatePresence mode="popLayout">
                {data?.items.map((quiz: any, idx: number) => (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <PublicQuizCard quiz={quiz} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-20 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="w-14 h-14 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white disabled:opacity-30"
                >
                  <ChevronLeft size={24} />
                </Button>
                
                <div className="flex items-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="font-black text-indigo-400">{page}</span>
                  <span className="text-zinc-600 font-bold">/</span>
                  <span className="text-zinc-400 font-bold">{totalPages}</span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === totalPages || isPlaceholderData}
                  onClick={() => setPage((p) => p + 1)}
                  className="w-14 h-14 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white disabled:opacity-30"
                >
                  <ChevronRight size={24} />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
