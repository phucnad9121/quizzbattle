export interface OptionResponse {
  id: string;
  option_text: string;
  order_index: int;
  is_correct?: boolean;
}

export interface QuestionResponse {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false";
  time_limit_secs: number;
  points: number;
  order_index: number;
  image_url: string | null;
  options: OptionResponse[];
}

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

export interface QuizDetailResponse extends QuizResponse {
  questions: QuestionResponse[];
}
