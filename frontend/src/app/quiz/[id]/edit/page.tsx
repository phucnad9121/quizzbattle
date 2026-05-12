"use client";

import { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useQuizDetail, useUpdateQuiz, useDeleteQuiz } from "@/hooks/useQuizzes";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Globe, Lock, Trash2, Save } from "lucide-react";
import Link from "next/link";
import { AxiosError } from "axios";

const formSchema = z.object({
  title: z
    .string()
    .min(1, "Tiêu đề không được để trống")
    .max(200, "Tiêu đề không được vượt quá 200 ký tự"),
  description: z.string().optional(),
  is_public: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  
  const { data: quiz, isLoading: isFetching, isError } = useQuizDetail(id);
  const { mutateAsync: updateQuiz, isPending: isUpdating } = useUpdateQuiz();
  const { mutateAsync: deleteQuiz, isPending: isDeleting } = useDeleteQuiz();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      is_public: false,
    },
  });

  useEffect(() => {
    if (quiz) {
      form.reset({
        title: quiz.title,
        description: quiz.description || "",
        is_public: quiz.is_public,
      });
    }
  }, [quiz, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await updateQuiz({ id, data: values });
      toast({
        title: "Thành công",
        description: "Cập nhật thông tin Quiz thành công.",
      });
      router.push(`/quiz/${id}/questions`);
    } catch (error) {
      const axiosError = error as AxiosError<{ detail: string | Record<string, unknown>[] }>;
      let errorMessage = "Đã có lỗi xảy ra. Vui lòng thử lại sau.";
      const detail = axiosError.response?.data?.detail;
      if (typeof detail === "string") {
        errorMessage = detail;
      } else if (Array.isArray(detail) && detail.length > 0 && detail[0].msg && typeof detail[0].msg === "string") {
        errorMessage = detail[0].msg;
      }
      toast({
        title: "Cập nhật thất bại",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteQuiz(id);
      toast({
        title: "Đã xóa Quiz",
        description: "Bộ câu hỏi của bạn đã được xóa hoàn toàn.",
      });
      setIsDeleteDialogOpen(false);
      router.push("/dashboard");
    } catch {
      toast({
        title: "Lỗi",
        description: "Không thể xóa quiz lúc này.",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (isError || !quiz) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] text-white">
        <p className="text-red-400 font-bold mb-6 text-xl">Không tìm thấy quiz hoặc bạn không có quyền chỉnh sửa.</p>
        <Link href="/dashboard">
          <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5">Quay lại Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12 relative overflow-hidden font-sans">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-600/10 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <Link
              href={`/quiz/${id}/questions`}
              className="inline-flex items-center text-xs font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-indigo-400 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Quay lại danh sách câu hỏi
            </Link>
            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-white uppercase leading-none">
                Cài đặt <span className="text-indigo-500">Quiz</span>
              </h1>
              <p className="text-zinc-500 font-medium max-w-lg">
                Thay đổi tiêu đề, mô tả và quyền riêng tư cho bộ câu hỏi của bạn.
              </p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="h-14 px-8 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-black uppercase tracking-widest text-[10px] gap-3 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Xóa Quiz
          </Button>
        </div>

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-8 md:p-12">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Tiêu đề bộ câu hỏi</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nhập tên bộ câu hỏi..." 
                          {...field} 
                          className="h-16 bg-white/5 border-2 border-white/5 rounded-2xl px-6 text-xl font-bold focus:border-indigo-500/50 focus:ring-0 transition-all text-white placeholder:text-zinc-700"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Mô tả chi tiết</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Viết một vài dòng giới thiệu về bộ Quiz này..." 
                          className="min-h-[160px] bg-white/5 border-2 border-white/5 rounded-2xl p-6 text-lg font-medium focus:border-indigo-500/50 focus:ring-0 transition-all text-white placeholder:text-zinc-700 resize-none leading-relaxed"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_public"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-3xl border border-white/5 p-8 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                      <div className="space-y-2">
                        <FormLabel className="text-xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
                          {field.value ? (
                            <Globe className="w-6 h-6 text-emerald-400 animate-pulse" />
                          ) : (
                            <Lock className="w-6 h-6 text-zinc-500" />
                          )}
                          Chế độ công khai
                        </FormLabel>
                        <FormDescription className="text-zinc-500 font-medium">
                          {field.value 
                            ? "Bất kỳ ai cũng có thể tìm thấy và tham gia bộ câu hỏi này." 
                            : "Chỉ bạn mới có thể nhìn thấy và sử dụng bộ câu hỏi này."}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <label className="relative inline-flex items-center cursor-pointer scale-125">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={field.value}
                            onChange={field.onChange}
                          />
                          <div className="w-12 h-7 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-zinc-500 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                        </label>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="pt-8 border-t border-white/5 flex items-center justify-end gap-6">
                  <Link href={`/quiz/${id}/questions`}>
                    <Button type="button" variant="ghost" className="h-14 px-8 rounded-2xl text-zinc-500 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[10px] transition-all">
                      Hủy thay đổi
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={isUpdating}
                    className="h-16 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase italic text-lg shadow-[0_20px_40px_rgba(79,70,229,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="h-6 w-6" />
                        Lưu Thay Đổi
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>

      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={
          <div className="flex items-center gap-3 text-red-400">
            <Trash2 className="w-6 h-6" />
            <span>Xóa Bộ Câu Hỏi</span>
          </div>
        }
        description={
          <div className="space-y-4 pt-4">
            <p className="text-lg text-zinc-300">
              Bạn có chắc chắn muốn xóa vĩnh viễn bộ câu hỏi <strong className="text-white italic">&quot;{quiz.title}&quot;</strong> không?
            </p>
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <p className="text-sm text-red-400 font-bold uppercase tracking-widest">Cảnh báo:</p>
              <p className="text-sm text-red-300/70 mt-1">Hành động này không thể hoàn tác và toàn bộ lịch sử chơi sẽ bị mất.</p>
            </div>
          </div>
        }
        onConfirm={handleDelete}
        isLoading={isDeleting}
        confirmText="Đồng ý Xóa"
      />
    </div>
  );
}
