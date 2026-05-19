"use client";

import { use, useState, useEffect } from "react";
import { useQuizDetail } from "@/hooks/useQuizzes";
import { useCreateQuestion, useUpdateQuestion, useDeleteQuestion, useReorderQuestions, CreateQuestionData } from "@/hooks/useQuestions";
import { QuestionResponse } from "@/types/quiz";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Loader2, Plus, GripVertical, Settings, Pencil, Trash2, ArrowLeft, HelpCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { QuestionForm } from "@/components/quiz/QuestionForm";
import { AIGeneratorModal } from "@/components/quiz/AIGeneratorModal";
import { AxiosError } from "axios";

// DND Kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableQuestionItem({ 
  question, 
  index, 
  onEdit, 
  onDelete 
}: { 
  question: QuestionResponse; 
  index: number; 
  onEdit: (q: QuestionResponse) => void;
  onDelete: (q: QuestionResponse) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-white/5 backdrop-blur-md rounded-[1.5rem] border p-5 flex items-start gap-4 group transition-all duration-300 ${isDragging ? 'border-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.3)] ring-1 ring-indigo-500/50 scale-[1.02] z-50' : 'border-white/5 hover:border-white/20 hover:bg-white/[0.08]'}`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="mt-1.5 cursor-grab active:cursor-grabbing p-2 text-zinc-600 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-all"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              Câu {index + 1}
            </span>
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
              <span className="bg-white/5 px-2 py-0.5 rounded-md">{question.time_limit_secs}S</span>
              <span className="bg-white/5 px-2 py-0.5 rounded-md text-emerald-400">{question.points} PTS</span>
              <span className="bg-white/5 px-2 py-0.5 rounded-md text-purple-400">{question.question_type === "true_false" ? "Đúng/Sai" : "Nhiều lựa chọn"}</span>
            </div>
          </div>
        </div>
        <h3 className="text-lg font-bold text-white leading-snug line-clamp-2 italic uppercase tracking-tight">{question.question_text}</h3>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <Button variant="ghost" size="icon" onClick={() => onEdit(question)} className="h-10 w-10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(question)} className="h-10 w-10 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/10">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Route sync after directory cleanup.
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = use(params);
  const { toast } = useToast();
  
  const { data: quiz, isLoading } = useQuizDetail(quizId);
  const { mutateAsync: createQuestion, isPending: isCreating } = useCreateQuestion(quizId);
  const { mutateAsync: updateQuestion, isPending: isUpdating } = useUpdateQuestion(quizId);
  const { mutateAsync: deleteQuestion, isPending: isDeleting } = useDeleteQuestion(quizId);
  const { mutateAsync: reorderQuestions, isPending: isReordering } = useReorderQuestions(quizId);

  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionResponse | null>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<QuestionResponse | null>(null);

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Sync questions from server
  useEffect(() => {
    if (quiz?.questions) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuestions([...quiz.questions].sort((a, b) => a.order_index - b.order_index));
    }
  }, [quiz?.questions]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex(q => q.id === active.id);
    const newIndex = questions.findIndex(q => q.id === over.id);

    const newQuestions = arrayMove(questions, oldIndex, newIndex);
    // Optimistic update
    setQuestions(newQuestions);

    try {
      await reorderQuestions(newQuestions.map(q => q.id));
    } catch {
      toast({ title: "Lỗi", description: "Không thể thay đổi thứ tự. Đang khôi phục...", variant: "destructive" });
      setQuestions(questions); // Rollback
    }
  };

  const handleFormSubmit = async (data: CreateQuestionData) => {
    try {
      if (editingQuestion) {
        await updateQuestion({ id: editingQuestion.id, data });
        toast({ title: "Đã cập nhật câu hỏi" });
      } else {
        await createQuestion(data);
        toast({ title: "Đã thêm câu hỏi mới" });
      }
      setIsFormOpen(false);
      setEditingQuestion(null);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail: string | Record<string, unknown>[] }>;
      const detail = axiosError.response?.data?.detail;
      const msg = (Array.isArray(detail) && detail[0] && typeof detail[0].msg === "string" ? detail[0].msg : detail) || "Lỗi xử lý";
      toast({ title: "Thất bại", description: typeof msg === "string" ? msg : "Lỗi không xác định", variant: "destructive" });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingQuestion) return;
    try {
      await deleteQuestion(deletingQuestion.id);
      toast({ title: "Đã xóa câu hỏi" });
      setIsDeleteDialogOpen(false);
      setDeletingQuestion(null);
    } catch {
      toast({ title: "Lỗi", description: "Không thể xóa câu hỏi", variant: "destructive" });
    }
  };

  if (isLoading || !quiz) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white py-10 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:3s]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <Link href="/quiz" className="inline-flex items-center text-sm font-black uppercase tracking-widest text-zinc-500 hover:text-indigo-400 transition-colors group">
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Quay lại My Quiz
            </Link>
            <div className="space-y-2">
               <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-white uppercase leading-none">{quiz.title}</h1>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                    <HelpCircle className="w-4 h-4 text-indigo-400" /> 
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">{questions.length} CÂU HỎI</span>
                  </div>
                  {isReordering && (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" /> Đang lưu thứ tự...
                    </div>
                  )}
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsAIModalOpen(true)}
              className="h-14 px-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 font-black uppercase tracking-widest text-[10px] gap-3 transition-all group"
            >
              <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" /> Tạo câu hỏi AI
            </Button>
            <Link href={`/quiz/${quizId}/edit`}>
              <Button variant="ghost" className="h-14 px-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] gap-3 transition-all">
                <Settings className="w-4 h-4" /> Cài đặt
              </Button>
            </Link>
            <Button 
              className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase italic text-lg gap-3 shadow-[0_20px_40px_rgba(79,70,229,0.3)] transition-all hover:scale-105 active:scale-95"
              onClick={() => { setEditingQuestion(null); setIsFormOpen(true); }}
            >
              <Plus className="w-6 h-6" /> Thêm câu hỏi
            </Button>
          </div>
        </div>

        {/* Questions List Container */}
        <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-8 shadow-2xl min-h-[500px]">
          {questions.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-zinc-500 text-center space-y-6">
              <div className="w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center border border-white/5">
                <HelpCircle className="w-10 h-10 opacity-20" />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-black italic uppercase tracking-tight text-white">Chưa có câu hỏi nào</p>
                <p className="text-zinc-500 font-medium max-w-[240px]">Hãy bắt đầu xây dựng bộ Quiz của bạn bằng cách thêm câu hỏi đầu tiên.</p>
              </div>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {questions.map((q, index) => (
                    <SortableQuestionItem 
                      key={q.id} 
                      question={q} 
                      index={index} 
                      onEdit={(q) => { setEditingQuestion(q); setIsFormOpen(true); }}
                      onDelete={(q) => { setDeletingQuestion(q); setIsDeleteDialogOpen(true); }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

      </div>

      {/* Form Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto bg-[#020617] border-white/10 p-0 rounded-[3rem] overflow-hidden">
          <div className="p-8 md:p-12 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-4xl font-black italic uppercase tracking-tighter text-white">
                {editingQuestion ? "Cập nhật" : "Thêm"} <span className="text-indigo-500">Câu hỏi</span>
              </DialogTitle>
            </DialogHeader>
            <QuestionForm 
              initialData={editingQuestion} 
              onSubmit={handleFormSubmit} 
              onCancel={() => setIsFormOpen(false)} 
              isPending={isCreating || isUpdating} 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Xóa Câu Hỏi"
        description="Hành động này không thể hoàn tác. Bạn có chắc chắn muốn loại bỏ câu hỏi này khỏi bộ sưu tập?"
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        confirmText="Xóa ngay"
      />

      <AIGeneratorModal 
        quizId={quizId}
        isOpen={isAIModalOpen}
        onOpenChange={setIsAIModalOpen}
      />
    </div>
  );
}
