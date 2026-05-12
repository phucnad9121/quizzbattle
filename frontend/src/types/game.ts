export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export type Participant = {
	user_id: string;
	display_name: string;
	score: number;
};

export type RoomStatePayload = {
	room_code: string;
	status: string;
	host_id: string;
	quiz_id: string;
	is_latejoiner: boolean;
	participants: Participant[];
};

export type PlayerJoinedPayload = {
	user_id: string;
	display_name: string;
	score: number;
};

export type PlayerLeftPayload = {
	user_id: string;
};

export type QuestionOption = {
	id: string;
	option_text: string;
};

export type QuestionStartPayload = {
	quiz_id: string;
	question_id: string;
	question_idx: number;
	total_questions: number;
	question_text: string;
	question_type: string;
	time_limit_secs: number;
	points: number;
	options: QuestionOption[];
};

export type AnswerAckPayload = {
	is_correct?: boolean;
	score_earned?: number;
	answer_time_ms?: number;
	error?: string;
};

export type LeaderboardEntry = {
	rank: number;
	user_id: string;
	display_name: string;
	score: number;
};

export type QuestionEndPayload = {
	question_idx: number;
	correct_option_id: string | null;
	correct_option_text: string;
	wait_time?: number;
	leaderboard: LeaderboardEntry[];
};

export type GameOverPayload = {
	quiz_id?: string;
	leaderboard: LeaderboardEntry[];
};

export type FinalResults = LeaderboardEntry[];

export type WsMessage<TPayload = unknown> = {
	type: string;
	payload?: TPayload;
};
