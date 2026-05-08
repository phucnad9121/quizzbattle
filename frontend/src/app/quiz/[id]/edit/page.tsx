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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (isError || !quiz) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <p className="text-red-500 font-medium mb-4">Không tìm thấy quiz hoặc bạn không có quyền chỉnh sửa.</p>
        <Link href="/dashboard">
          <Button variant="outline">Quay lại</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Link
              href={`/quiz/${id}/questions`}
              className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại chi tiết
            </Link>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Chỉnh sửa Quiz</h1>
            <p className="text-slate-500 mt-2">Cập nhật thông tin chung cho &quot;{quiz.title}&quot;.</p>
          </div>
          
          <Button 
            variant="destructive" 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Xóa Quiz
          </Button>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 sm:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-slate-900">Tiêu đề Quiz</FormLabel>
                      <FormControl>
                        <Input placeholder="Nhập tên bộ câu hỏi" {...field} className="text-base h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-slate-900">Mô tả (Không bắt buộc)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Viết một vài dòng mô tả..." 
                          className="resize-none h-32 text-base"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_public"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-200 p-4 shadow-sm bg-slate-50/50">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-semibold text-slate-900 flex items-center gap-2">
                          {field.value ? <Globe className="w-5 h-5 text-emerald-500" /> : <Lock className="w-5 h-5 text-slate-500" />}
                          Chế độ công khai
                        </FormLabel>
                        <FormDescription className="mt-1">
                          {field.value 
                            ? "Bất kỳ ai cũng có thể tìm thấy và tham gia bộ câu hỏi này." 
                            : "Chỉ bạn mới có thể nhìn thấy bộ câu hỏi này."}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={field.value}
                            onChange={field.onChange}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-4">
                  <Button 
                    type="submit" 
                    disabled={isUpdating}
                    className="bg-indigo-600 hover:bg-indigo-700 px-8 py-6 text-base font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" />
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
          <>
            <Trash2 className="w-5 h-5" />
            Xóa Bộ Câu Hỏi
          </>
        }
        description={
          <>
            Bạn có chắc chắn muốn xóa vĩnh viễn bộ câu hỏi <strong>&quot;{quiz.title}&quot;</strong> không? Hành động này không thể hoàn tác và toàn bộ câu hỏi bên trong sẽ bị mất.
          </>
        }
        onConfirm={handleDelete}
        isLoading={isDeleting}
        confirmText="Đồng ý Xóa"
      />
    </div>
  );
}
