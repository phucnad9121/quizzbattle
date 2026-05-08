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
import { Trash2, PlusCircle, CheckCircle2, Circle } from "lucide-react";

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
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isCorrect ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
      <button
        type="button"
        onClick={() => setCorrectAnswer(index)}
        className="flex-shrink-0 focus:outline-none"
      >
        {isCorrect ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        ) : (
          <Circle className="w-6 h-6 text-slate-300 hover:text-indigo-400 transition-colors" />
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
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent px-0 font-medium h-auto py-1"
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
          className="text-slate-400 hover:text-red-500 h-8 w-8"
        >
          <Trash2 className="w-4 h-4" />
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
        <FormField
          control={form.control}
          name="question_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nội dung câu hỏi</FormLabel>
              <FormControl>
                <Input placeholder="Điền câu hỏi của bạn..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="time_limit_secs"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Thời gian</FormLabel>
                  <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
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
                    className="py-3"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="points"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Điểm số</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="question_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Loại câu hỏi</FormLabel>
              <FormControl>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50"
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
                  <option value="multiple_choice">Nhiều lựa chọn</option>
                  <option value="true_false">Đúng / Sai</option>
                </select>
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Các đáp án</FormLabel>
            {watchType === "multiple_choice" && fields.length < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ option_text: "", is_correct: false })}
                className="h-8 flex items-center gap-1 text-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Thêm đáp án
              </Button>
            )}
          </div>
          
          {form.formState.errors.options?.root?.message && (
            <p className="text-sm font-medium text-red-500">{form.formState.errors.options.root.message}</p>
          )}

          <div className="space-y-3">
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

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
            {initialData ? "Cập nhật" : "Tạo mới"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
