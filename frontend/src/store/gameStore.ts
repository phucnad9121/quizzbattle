import { create } from "zustand";

import type {
	AnswerAckPayload,
	FinalResults,
	GameOverPayload,
	LeaderboardEntry,
	Participant,
	PlayerJoinedPayload,
	PlayerLeftPayload,
	QuestionStartPayload,
	RoomStatePayload,
} from "@/types/game";

type GameState = {
	roomCode: string | null;
	status: string | null;
	players: Participant[];
	currentQuestion: QuestionStartPayload | null;
	timeLeft: number | null;
	selectedOption: string | null;
	answerResult: AnswerAckPayload | null;
	leaderboard: LeaderboardEntry[];
	finalResults: FinalResults | null;
	setRoomState: (payload: RoomStatePayload) => void;
	setQuestion: (payload: QuestionStartPayload) => void;
	setTimeLeft: (seconds: number | null) => void;
	selectOption: (optionId: string | null) => void;
	setAnswerResult: (payload: AnswerAckPayload | null) => void;
	updateLeaderboard: (entries: LeaderboardEntry[]) => void;
	setGameOver: (payload: GameOverPayload) => void;
	handlePlayerJoined: (payload: PlayerJoinedPayload) => void;
	handlePlayerLeft: (payload: PlayerLeftPayload) => void;
	resetGame: () => void;
};

const initialState = {
	roomCode: null,
	status: null,
	players: [],
	currentQuestion: null,
	timeLeft: null,
	selectedOption: null,
	answerResult: null,
	leaderboard: [],
	finalResults: null,
};

export const useGameStore = create<GameState>((set) => ({
	...initialState,
	setRoomState: (payload) =>
		set(() => ({
			roomCode: payload.room_code,
			status: payload.status,
			players: payload.participants,
		})),
	setQuestion: (payload) =>
		set(() => ({
			currentQuestion: payload,
			status: "in_progress",
			selectedOption: null,
			answerResult: null,
		})),
	setTimeLeft: (seconds) => set(() => ({ timeLeft: seconds })),
	selectOption: (optionId) => set(() => ({ selectedOption: optionId })),
	setAnswerResult: (payload) => set(() => ({ answerResult: payload })),
	updateLeaderboard: (entries) => set(() => ({ leaderboard: entries })),
	setGameOver: (payload) =>
		set(() => ({
			status: "finished",
			finalResults: payload.leaderboard,
			leaderboard: payload.leaderboard,
		})),
	handlePlayerJoined: (payload) =>
		set((state) => {
			const exists = state.players.some((p) => p.user_id === payload.user_id);
			if (exists) {
				return {
					players: state.players.map((p) =>
						p.user_id === payload.user_id ? { ...p, ...payload } : p
					),
				};
			}
			return { players: [...state.players, payload] };
		}),
	handlePlayerLeft: (payload) =>
		set((state) => ({
			players: state.players.filter((p) => p.user_id !== payload.user_id),
		})),
	resetGame: () => set(() => ({ ...initialState })),
}));
