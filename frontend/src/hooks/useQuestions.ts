import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { QuestionResponse } from "@/types/quiz";

export interface CreateOptionData {
  option_text: string;
  is_correct: boolean;
}

export interface CreateQuestionData {
  question_text: string;
  question_type: "multiple_choice" | "true_false";
  time_limit_secs: number;
  points: number;
  options: CreateOptionData[];
}

export const useCreateQuestion = (quizId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateQuestionData) => {
      const res = await apiClient.post<QuestionResponse>(`/quizzes/${quizId}/questions`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
    },
  });
};

export const useUpdateQuestion = (quizId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateQuestionData }) => {
      const res = await apiClient.patch<QuestionResponse>(`/questions/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
    },
  });
};

export const useDeleteQuestion = (quizId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
    },
  });
};

export const useReorderQuestions = (quizId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (questionIds: string[]) => {
      await apiClient.put(`/quizzes/${quizId}/questions/reorder`, {
        question_ids: questionIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
    },
  });
};
