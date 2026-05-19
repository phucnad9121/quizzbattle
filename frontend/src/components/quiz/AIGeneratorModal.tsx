"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Trash2, BrainCircuit, Plus } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useBulkCreateQuestions, CreateQuestionData } from "@/hooks/useQuestions";
import { useToast } from "@/components/ui/use-toast";

interface AIGeneratorModalProps {
  quizId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIGeneratorModal({ quizId, isOpen, onOpenChange }: AIGeneratorModalProps) {
  const { toast } = useToast();
  const { mutateAsync: bulkCreate, isPending: isSaving } = useBulkCreateQuestions(quizId);

  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [generatedQuestions, setGeneratedQuestions] = useState<CreateQuestionData[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    setIsGenerating(true);
    setGeneratedQuestions([]);
    setSelectedIndices([]);
    
    try {
      const response = await apiClient.post(`/quizzes/${quizId}/ai-generate`, {
        topic,
        num_questions: numQuestions,
        difficulty,
        language: "Vietnamese"
      });
      
      const questions = response.data.questions;
      setGeneratedQuestions(questions);
      // Auto select all
      setSelectedIndices(questions.map((_: any, i: number) => i));
    } catch (error: any) {
      toast({
        title: "Lỗi tạo câu hỏi",
        description: error.response?.data?.detail || "Không thể gọi AI lúc này. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelect = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleSave = async () => {
    const questionsToSave = generatedQuestions.filter((_, i) => selectedIndices.includes(i));
    if (questionsToSave.length === 0) return;

    try {
      await bulkCreate(questionsToSave);
      toast({
        title: "Thành công",
        description: `Đã thêm ${questionsToSave.length} câu hỏi vào bộ Quiz.`
      });
      onOpenChange(false);
      reset();
    } catch (error) {
      toast({
        title: "Lỗi lưu câu hỏi",
        description: "Đã có lỗi xảy ra khi lưu vào database.",
        variant: "destructive"
      });
    }
  };

  const reset = () => {
    setTopic("");
    setGeneratedQuestions([]);
    setSelectedIndices([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-[#020617] border-white/10 rounded-[3rem] p-0">
        <DialogHeader className="p-8 md:p-10 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500 rounded-3xl rotate-6 shadow-lg shadow-indigo-500/20">
               <BrainCircuit className="text-white" size={32} />
            </div>
            <div>
              <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-white">
                Tạo câu hỏi <span className="text-indigo-500">AI Power</span>
              </DialogTitle>
              <p className="text-zinc-500 text-sm font-medium">Sử dụng Claude AI để tự động tạo bộ câu hỏi chất lượng</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-8 custom-scrollbar">
          {generatedQuestions.length === 0 ? (
            <div className="space-y-8 py-4">
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Chủ đề câu hỏi</label>
                <Input 
                  placeholder="Ví dụ: Lịch sử Việt Nam triều Nguyễn, Lập trình React..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="h-16 px-6 bg-white/5 border-white/10 rounded-2xl text-lg focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Số lượng câu (1-10)</label>
                  <Input 
                    type="number"
                    min={1}
                    max={10}
                    value={numQuestions || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setNumQuestions(isNaN(val) ? 0 : val);
                    }}
                    className="h-16 px-6 bg-white/5 border-white/10 rounded-2xl text-lg focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Độ khó</label>
                  <select 
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full h-16 px-6 bg-white/5 border border-white/10 rounded-2xl text-lg text-white focus:border-indigo-500 transition-all outline-hidden appearance-none"
                  >
                    <option value="easy" className="bg-[#020617]">Dễ</option>
                    <option value="medium" className="bg-[#020617]">Trung bình</option>
                    <option value="hard" className="bg-[#020617]">Khó</option>
                  </select>
                </div>
              </div>

              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-6">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 animate-spin text-indigo-500" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-300 animate-pulse" size={24} />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-2xl font-black italic uppercase tracking-tight text-white animate-pulse">Đang tạo câu hỏi...</p>
                    <p className="text-zinc-500 font-medium">Trí tuệ nhân tạo đang biên soạn câu hỏi cho bạn</p>
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={handleGenerate}
                  disabled={!topic.trim() || numQuestions < 1}
                  className="w-full h-20 rounded-[2rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase italic text-2xl gap-4 shadow-[0_20px_50px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.02] active:scale-95 group"
                >
                  <Sparkles className="w-8 h-8 group-hover:rotate-12 transition-transform" />
                  Khai hỏa AI ngay
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl mb-4">
                <p className="text-indigo-300 font-bold">Tìm thấy {generatedQuestions.length} câu hỏi phù hợp cho chủ đề: <span className="text-white italic">"{topic}"</span></p>
                <Button variant="ghost" size="sm" onClick={reset} className="text-zinc-500 hover:text-white">Thay đổi topic</Button>
              </div>

              <div className="space-y-4">
                {generatedQuestions.map((q, idx) => (
                  <div 
                    key={idx}
                    onClick={() => toggleSelect(idx)}
                    className={`relative p-6 rounded-[2rem] border transition-all cursor-pointer group ${
                      selectedIndices.includes(idx) 
                        ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_10px_30px_rgba(79,70,229,0.1)]' 
                        : 'bg-white/5 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="absolute top-6 right-6">
                       {selectedIndices.includes(idx) ? (
                         <CheckCircle2 className="text-indigo-400" size={24} />
                       ) : (
                         <div className="w-6 h-6 rounded-full border-2 border-white/10 group-hover:border-white/30" />
                       )}
                    </div>
                    
                    <div className="flex flex-col gap-3 pr-8">
                       <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Câu {idx + 1}</span>
                       <h4 className="text-lg font-bold text-white italic leading-tight">{q.question_text}</h4>
                       <div className="grid grid-cols-2 gap-2 mt-2">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className={`text-xs p-2 rounded-xl border ${opt.is_correct ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-zinc-500'}`}>
                              {opt.option_text}
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {generatedQuestions.length > 0 && (
          <DialogFooter className="p-8 md:p-10 border-t border-white/5 flex-row gap-4 sm:justify-between items-center bg-black/20">
            <div className="flex flex-col">
              <span className="text-white font-black text-xl italic uppercase tracking-tight">Đã chọn {selectedIndices.length} câu</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Sẵn sàng đưa vào bộ Quiz</span>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" onClick={reset} className="h-14 px-8 rounded-2xl text-zinc-500 hover:text-white font-black uppercase tracking-widest">Hủy</Button>
              <Button 
                onClick={handleSave} 
                disabled={selectedIndices.length === 0 || isSaving}
                className="h-14 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase italic tracking-wider shadow-[0_15px_30px_rgba(16,185,129,0.3)] gap-2 transition-all"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                Lưu vào bộ Quiz
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
