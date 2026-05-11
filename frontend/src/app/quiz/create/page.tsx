"use client";
// Full UI restored after cache clear.

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useCreateQuiz } from "@/hooks/useQuizzes";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Globe, Lock } from "lucide-react";
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
        <div className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
          <div className="p-8 sm:p-12">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-black uppercase tracking-widest text-white ml-1">Tiêu đề Quiz</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nhập tên bộ câu hỏi (VD: Kiến thức chung 2024)" 
                          {...field} 
                          className="bg-white/5 border-2 border-white/5 rounded-2xl h-16 px-6 text-lg font-bold focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-zinc-600" 
                        />
                      </FormControl>
                      <FormDescription className="text-zinc-500 font-medium ml-1">
                        Tiêu đề ngắn gọn, súc tích giúp người chơi dễ dàng nhận biết.
                      </FormDescription>
                      <FormMessage className="text-red-400 font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-black uppercase tracking-widest text-white ml-1">Mô tả (Không bắt buộc)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Viết một vài dòng mô tả về bộ câu hỏi này..." 
                          className="bg-white/5 border-2 border-white/5 rounded-2xl min-h-[140px] p-6 text-lg font-medium focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-zinc-600 resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-zinc-500 font-medium ml-1">
                        Mô tả chi tiết để thu hút người chơi tham gia.
                      </FormDescription>
                      <FormMessage className="text-red-400 font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_public"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-[2rem] border border-white/10 p-6 bg-white/5 backdrop-blur-md">
                      <div className="space-y-1">
                        <FormLabel className="text-lg font-black italic uppercase tracking-tight text-white flex items-center gap-3">
                          {field.value ? <Globe className="w-6 h-6 text-emerald-400" /> : <Lock className="w-6 h-6 text-zinc-500" />}
                          Chế độ công khai
                        </FormLabel>
                        <FormDescription className="text-zinc-500 font-medium">
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
                          <div className="w-14 h-8 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                        </label>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="pt-8 border-t border-white/5 flex items-center justify-end gap-6">
                  <Link href="/dashboard">
                    <Button type="button" variant="ghost" className="h-14 px-8 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[10px]">
                      Hủy bỏ
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={isPending}
                    className="h-16 px-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase italic rounded-2xl shadow-[0_20px_40px_rgba(79,70,229,0.3)] transition-all hover:scale-105 active:scale-95"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        Đang tạo...
                      </>
                    ) : (
                      "Lưu và Tiếp tục"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>

      </div>
    </div>

  );
}
