"use client";
// Full UI restored after cache clear.

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useCreateQuiz } from "@/hooks/useQuizzes";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Globe, Lock, PlusCircle, Upload, FileText, Sparkles } from "lucide-react";
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

export default function Page() {
  const router = useRouter();
  const { toast } = useToast();
  const { mutateAsync: createQuiz, isPending } = useCreateQuiz();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      is_public: false,
    },
  });

  const [createMode, setCreateMode] = useState<"manual" | "import">("manual");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"excel" | "word">("excel");

  const onSubmit = async (values: FormValues) => {
    try {
      const newQuiz = await createQuiz(values);
      toast({
        title: "Tạo Quiz thành công!",
        description: "Bây giờ bạn có thể thêm câu hỏi vào bộ quiz này.",
      });
      router.push(`/quiz/${newQuiz.id}/questions`);
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
        title: "Tạo Quiz thất bại",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const values = form.getValues();
    if (!values.title) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng nhập tiêu đề Quiz.", variant: "destructive" });
      return;
    }
    if (!selectedFile) {
      toast({ title: "Thiếu file", description: "Vui lòng chọn file Excel để upload.", variant: "destructive" });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("description", values.description || "");
      formData.append("is_public", String(values.is_public));
      formData.append("file", selectedFile);

      const endpoint = fileType === "excel" ? "/quizzes/import-excel" : "/quizzes/import-word";
      const response = await apiClient.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast({ title: "Thành công!", description: `Đã tạo bộ Quiz từ file ${fileType === "excel" ? "Excel" : "Word"}.` });
      router.push(`/quiz/${response.data.id}/questions`);
    } catch (error: any) {
      toast({
        title: "Thất bại",
        description: error?.response?.data?.detail || `Lỗi khi xử lý file ${fileType}.`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white py-10 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:3s]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-black uppercase tracking-widest text-zinc-500 hover:text-indigo-400 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Quay lại Dashboard
          </Link>
          <div className="space-y-3">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Khởi tạo</span>
             </div>
             <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-white uppercase leading-none">
                Tạo <span className="text-indigo-500">Bí Kíp</span> Mới
             </h1>
             <p className="text-zinc-400 font-medium text-lg">Bắt đầu bằng cách điền thông tin cơ bản cho bộ câu hỏi của bạn.</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden">
          {/* Tab Switcher */}
          <div className="flex p-2 bg-black/20 m-8 mb-0 rounded-2xl gap-2">
            <button 
              onClick={() => setCreateMode("manual")}
              className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 ${createMode === "manual" ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
            >
              <PlusCircle size={14} />
              Tạo thủ công
            </button>
            <button 
              onClick={() => setCreateMode("import")}
              className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 ${createMode === "import" ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
            >
              <Upload size={14} />
              Nhập từ file
            </button>
          </div>

          <div className="p-8 sm:p-12">
            <Form {...form}>
              <form onSubmit={createMode === "manual" ? form.handleSubmit(onSubmit) : handleImport} className="space-y-10">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Tiêu đề Quiz</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nhập tên bộ câu hỏi..." 
                            {...field} 
                            className="h-14 bg-white/5 border-2 border-white/5 rounded-2xl px-6 text-lg font-bold focus:border-indigo-500/50 focus:ring-0 transition-all text-white placeholder:text-zinc-800"
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
                      <FormItem className="space-y-3">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Quyền riêng tư</FormLabel>
                        <div 
                          onClick={() => field.onChange(!field.value)}
                          className="h-14 bg-white/5 border-2 border-white/5 rounded-2xl px-6 flex items-center justify-between cursor-pointer group hover:bg-white/[0.08] transition-all"
                        >
                          <div className="flex items-center gap-3">
                            {field.value ? <Globe className="text-emerald-400 w-4 h-4" /> : <Lock className="text-zinc-500 w-4 h-4" />}
                            <span className={`font-bold uppercase tracking-widest text-[10px] ${field.value ? 'text-emerald-400' : 'text-zinc-500'}`}>
                              {field.value ? 'Công khai' : 'Riêng tư'}
                            </span>
                          </div>
                          <div className={`w-8 h-4 rounded-full relative transition-colors ${field.value ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${field.value ? 'left-4.5' : 'left-0.5'}`} />
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {createMode === "manual" ? (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Mô tả chi tiết</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Viết một vài dòng giới thiệu về bộ Quiz này..." 
                              className="min-h-[140px] bg-white/5 border-2 border-white/5 rounded-2xl p-6 text-lg font-medium focus:border-indigo-500/50 focus:ring-0 transition-all text-white placeholder:text-zinc-800 resize-none leading-relaxed"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 font-bold" />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Loại file hỗ trợ</label>
                        <div className="flex gap-4">
                          <button 
                            type="button"
                            onClick={() => setFileType("excel")}
                            className={`flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px] border-2 transition-all flex items-center justify-center gap-3 ${fileType === "excel" ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300"}`}
                          >
                            Excel (.xlsx)
                          </button>
                          <button 
                            type="button"
                            onClick={() => setFileType("word")}
                            className={`flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px] border-2 transition-all flex items-center justify-center gap-3 ${fileType === "word" ? "bg-blue-500/10 border-blue-500 text-blue-500 shadow-lg shadow-blue-500/10" : "bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300"}`}
                          >
                            Word (.docx)
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Chọn file từ máy</label>
                        <div className="relative">
                          <input 
                            type="file" 
                            id="file-upload" 
                            className="hidden" 
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            accept={fileType === "excel" ? ".xlsx,.xls" : ".docx"}
                          />
                          <label 
                            htmlFor="file-upload"
                            className="flex items-center justify-between h-14 bg-indigo-500/5 border-2 border-dashed border-indigo-500/30 rounded-2xl px-6 cursor-pointer hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="text-indigo-400 w-5 h-5 group-hover:scale-110 transition-transform" />
                              <span className="text-xs font-bold text-zinc-300 truncate max-w-[150px]">
                                {selectedFile ? selectedFile.name : "Chọn file..."}
                              </span>
                            </div>
                            <span className="bg-indigo-600 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md text-white">Browse</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-4">
                      <Sparkles className="text-indigo-400 w-5 h-5 shrink-0 mt-1" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-black italic uppercase tracking-tighter text-indigo-300">Mẹo tạo nhanh</h4>
                        <p className="text-[10px] text-indigo-300/60 leading-relaxed font-medium">
                          Bôi màu nền cho ô đáp án đúng trong Excel để hệ thống tự động bóc tách câu hỏi.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-8 border-t border-white/5 flex items-center justify-end gap-6">
                  <Link href="/dashboard">
                    <Button type="button" variant="ghost" className="h-14 px-8 rounded-2xl text-zinc-500 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[10px] transition-all">
                      Hủy bỏ
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={isPending}
                    className="h-14 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase italic text-lg shadow-[0_15px_30px_rgba(79,70,229,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Đang tạo...
                      </>
                    ) : createMode === "manual" ? (
                      <>
                        <PlusCircle size={20} />
                        Tạo Bí Kíp
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        Up & Tạo
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>

        <p className="text-center mt-12 text-zinc-600 font-bold uppercase tracking-[0.2em] text-[10px]">
           QuizzBattle AI Engine • Bản quyền thuộc về phucdan
        </p>
      </div>
    </div>
  );
}
