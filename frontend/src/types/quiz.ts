export interface QuizResponse {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  owner_id: string;
  question_count: number;
  created_at: string;
}

export interface QuizListResponse {
  items: QuizResponse[];
  total: number;
  page: number;
  size: number;
}
