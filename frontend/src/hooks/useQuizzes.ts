import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QuizResponse, QuizListResponse, QuizDetailResponse } from "@/types/quiz";
import { apiClient } from "@/lib/api";

export const fetchQuizzes = async (): Promise<QuizListResponse> => {
  const { data } = await apiClient.get<QuizListResponse>("/quizzes");
  return data;
};

export const useQuizzes = () => {
  return useQuery({
    queryKey: ["quizzes"],
    queryFn: fetchQuizzes,
    staleTime: 60_000,
  });
};

export interface CreateQuizData {
  title: string;
  description?: string;
  is_public: boolean;
  cover_url?: string;
}

export const useCreateQuiz = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateQuizData) => {
      const res = await apiClient.post<QuizResponse>("/quizzes", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
  });
};

export const fetchQuizDetail = async (id: string): Promise<QuizDetailResponse> => {
  const { data } = await apiClient.get<QuizDetailResponse>(`/quizzes/${id}`);
  return data;
};

export const useQuizDetail = (id: string) => {
  return useQuery({
    queryKey: ["quiz", id],
    queryFn: () => fetchQuizDetail(id),
    staleTime: 0,
  });
};

export const useUpdateQuiz = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateQuizData> }) => {
      const res = await apiClient.patch<QuizResponse>(`/quizzes/${id}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["quiz", variables.id] });
    },
  });
};

export const useDeleteQuiz = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/quizzes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
  });
};
