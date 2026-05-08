import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { QuizListResponse } from "@/types/quiz";

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
