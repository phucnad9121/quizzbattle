"use client";

import { use, useState, useEffect } from "react";
import { useQuizDetail } from "@/hooks/useQuizzes";
import { useCreateQuestion, useUpdateQuestion, useDeleteQuestion, useReorderQuestions, CreateQuestionData } from "@/hooks/useQuestions";
import { QuestionResponse } from "@/types/quiz";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Loader2, Plus, GripVertical, Settings, Pencil, Trash2, ArrowLeft, HelpCircle } from "lucide-react";
import Link from "next/link";
import { QuestionForm } from "@/components/quiz/QuestionForm";
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
      className={`bg-white rounded-xl border p-4 shadow-sm flex items-start gap-4 group ${isDragging ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500 opacity-90' : 'border-slate-200'}`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="mt-1 cursor-grab active:cursor-grabbing p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 rounded-md transition-colors"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
            Câu {index + 1}
          </span>
          <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
            <span>{question.time_limit_secs}s</span>
            <span>•</span>
            <span>{question.points} pts</span>
            <span>•</span>
            <span>{question.question_type === "true_false" ? "Đúng/Sai" : "Nhiều lựa chọn"}</span>
          </div>
        </div>
        <h3 className="text-base font-semibold text-slate-800 line-clamp-2">{question.question_text}</h3>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" onClick={() => onEdit(question)} className="text-slate-500 hover:text-indigo-600">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(question)} className="text-slate-500 hover:text-red-600">
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
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{quiz.title}</h1>
            <p className="text-slate-500 flex items-center gap-2 mt-2">
              <HelpCircle className="w-4 h-4" /> {questions.length} câu hỏi
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/quiz/${quizId}/edit`}>
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" /> Cài đặt chung
              </Button>
            </Link>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-md"
              onClick={() => { setEditingQuestion(null); setIsFormOpen(true); }}
            >
              <Plus className="w-4 h-4" /> Thêm câu hỏi
            </Button>
          </div>
        </div>

        {/* Questions List */}
        <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200 p-6 shadow-sm min-h-[400px]">
          {isReordering && (
            <div className="absolute top-4 right-4 flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full z-10">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu thứ tự...
            </div>
          )}

          {questions.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-slate-400">
              <HelpCircle className="w-12 h-12 mb-4 opacity-20" />
              <p>Chưa có câu hỏi nào trong bộ Quiz này.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
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
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}</DialogTitle>
          </DialogHeader>
          <QuestionForm 
            initialData={editingQuestion} 
            onSubmit={handleFormSubmit} 
            onCancel={() => setIsFormOpen(false)} 
            isPending={isCreating || isUpdating} 
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Xóa Câu Hỏi"
        description="Bạn có chắc chắn muốn xóa câu hỏi này không? Không thể hoàn tác."
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        confirmText="Xóa"
      />
    </div>
  );
}
