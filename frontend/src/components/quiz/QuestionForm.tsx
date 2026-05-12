"use client";

import { useForm, useFieldArray, useWatch, UseFormReturn, UseFieldArrayRemove } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { QuestionResponse } from "@/types/quiz";
import { CreateQuestionData } from "@/hooks/useQuestions";
import { Trash2, PlusCircle, CheckCircle2, Circle, Loader2 } from "lucide-react";

// ... existing code ...

const optionSchema = z.object({
  option_text: z.string().min(1, "Không được để trống"),
  is_correct: z.boolean().default(false),
});

const formSchema = z.object({
  question_text: z.string().min(1, "Nhập nội dung câu hỏi"),
  question_type: z.enum(["multiple_choice", "true_false"]),
  time_limit_secs: z.coerce.number().min(5).max(120),
  points: z.coerce.number().min(1),
  options: z.array(optionSchema),
}).superRefine((data, ctx) => {
  const correctCount = data.options.filter(o => o.is_correct).length;
  
  if (data.question_type === "multiple_choice") {
    if (data.options.length < 2 || data.options.length > 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nhiều lựa chọn phải có từ 2 đến 4 đáp án",
        path: ["options"],
      });
    }
    if (correctCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phải có đúng 1 đáp án đúng",
        path: ["options"],
      });
    }
  } else if (data.question_type === "true_false") {
    if (data.options.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Đúng/Sai phải có 2 đáp án",
        path: ["options"],
      });
    }
    if (correctCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phải có 1 đáp án đúng",
        path: ["options"],
      });
    }
  }
});

type FormValues = z.infer<typeof formSchema>;

interface QuestionFormProps {
  initialData?: QuestionResponse | null;
  onSubmit: (data: CreateQuestionData) => void;
  onCancel: () => void;
  isPending: boolean;
}

interface OptionItemProps {
  index: number;
  watchType: string;
  remove?: UseFieldArrayRemove;
  form: UseFormReturn<FormValues>;
  setCorrectAnswer: (index: number) => void;
}

function OptionItem({ index, watchType, remove, form, setCorrectAnswer }: OptionItemProps) {
  const isCorrect = useWatch({
    control: form.control,
    name: `options.${index}.is_correct`,
  });

  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${isCorrect ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20'}`}>
      <button
        type="button"
        onClick={() => setCorrectAnswer(index)}
        className="flex-shrink-0 focus:outline-none group"
      >
        {isCorrect ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        ) : (
          <Circle className="w-8 h-8 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
        )}
      </button>
      
      <FormField
        control={form.control}
        name={`options.${index}.option_text`}
        render={({ field: inputField }) => (
          <FormItem className="flex-1 space-y-0">
            <FormControl>
              <Input 
                {...inputField} 
                placeholder={`Đáp án ${index + 1}`} 
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent px-0 font-bold text-white text-lg h-auto py-1 placeholder:text-zinc-600"
                readOnly={watchType === "true_false"}
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      {watchType === "multiple_choice" && remove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => remove(index)}
          className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10 h-10 w-10 rounded-xl transition-all"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}

export function QuestionForm({ initialData, onSubmit, onCancel, isPending }: QuestionFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question_text: initialData?.question_text || "",
      question_type: initialData?.question_type || "multiple_choice",
      time_limit_secs: initialData?.time_limit_secs || 30,
      points: initialData?.points || 100,
      options: initialData?.options?.map(o => ({
        option_text: o.option_text,
        is_correct: o.is_correct || false,
      })) || [
        { option_text: "", is_correct: true },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const watchType = form.watch("question_type");

  useEffect(() => {
    if (watchType === "true_false" && !initialData) {
      form.setValue("options", [
        { option_text: "Đúng", is_correct: true },
        { option_text: "Sai", is_correct: false },
      ]);
    }
  }, [watchType, form, initialData]);

  const setCorrectAnswer = (index: number) => {
    const currentOptions = form.getValues("options");
    const updatedOptions = currentOptions.map((opt, i) => ({
      ...opt,
      is_correct: i === index,
    }));
    form.setValue("options", updatedOptions, { shouldValidate: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="question_text"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Nội dung câu hỏi</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Điền câu hỏi của bạn..." 
                  {...field} 
                  className="bg-white/5 border-2 border-white/5 rounded-2xl h-16 px-6 text-xl font-bold focus:border-indigo-500/50 focus:ring-0 transition-all text-white placeholder:text-zinc-700"
                />
              </FormControl>
              <FormMessage className="text-red-400 font-bold" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="time_limit_secs"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Thời gian giới hạn</FormLabel>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                    {field.value} giây
                  </span>
                </div>
                <FormControl>
                  <Slider
                    min={5}
                    max={120}
                    step={5}
                    value={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                    className="py-2"
                  />
                </FormControl>
                <FormMessage className="text-red-400 font-bold" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="points"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Điểm số</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={1} 
                    {...field} 
                    className="bg-white/5 border-2 border-white/5 rounded-2xl h-14 px-6 text-lg font-bold focus:border-indigo-500/50 focus:ring-0 transition-all text-white"
                  />
                </FormControl>
                <FormMessage className="text-red-400 font-bold" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="question_type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Loại câu hỏi</FormLabel>
              <FormControl>
                <select
                  className="flex h-14 w-full rounded-2xl border-2 border-white/5 bg-white/5 px-6 py-2 text-lg font-bold text-white focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    if (e.target.value === "true_false") {
                      form.setValue("options", [
                        { option_text: "Đúng", is_correct: true },
                        { option_text: "Sai", is_correct: false },
                      ]);
                    } else if (e.target.value === "multiple_choice") {
                      form.setValue("options", [
                        { option_text: "", is_correct: true },
                        { option_text: "", is_correct: false },
                        { option_text: "", is_correct: false },
                        { option_text: "", is_correct: false },
                      ]);
                    }
                  }}
                >
                  <option value="multiple_choice" className="bg-slate-900 text-white">Nhiều lựa chọn</option>
                  <option value="true_false" className="bg-slate-900 text-white">Đúng / Sai</option>
                </select>
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Danh sách đáp án</FormLabel>
            {watchType === "multiple_choice" && fields.length < 4 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => append({ option_text: "", is_correct: false })}
                className="h-10 flex items-center gap-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-indigo-500/10 text-indigo-400 hover:text-indigo-300 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Thêm đáp án
              </Button>
            )}
          </div>
          
          {form.formState.errors.options?.root?.message && (
            <p className="text-xs font-bold text-red-400 bg-red-400/10 px-4 py-2 rounded-xl">{form.formState.errors.options.root.message}</p>
          )}

          <div className="grid grid-cols-1 gap-4">
            {fields.map((field, index) => (
              <OptionItem 
                key={field.id}
                index={index}
                watchType={watchType}
                remove={fields.length > 2 ? remove : undefined}
                form={form}
                setCorrectAnswer={setCorrectAnswer}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-8 border-t border-white/5">
          <Button type="button" variant="ghost" onClick={onCancel} className="h-14 px-8 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[10px]">
            Hủy bỏ
          </Button>
          <Button 
            type="submit" 
            disabled={isPending} 
            className="h-14 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase italic text-lg shadow-[0_20px_40px_rgba(79,70,229,0.3)] transition-all hover:scale-105 active:scale-95"
          >
            {isPending ? <Loader2 className="animate-spin" /> : (initialData ? "Cập nhật ngay" : "Lưu câu hỏi")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
