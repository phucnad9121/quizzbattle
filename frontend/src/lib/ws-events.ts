import { useGameStore } from "@/store/gameStore";
import type {
	AnswerAckPayload,
	GameOverPayload,
	PlayerJoinedPayload,
	PlayerLeftPayload,
	QuestionEndPayload,
	QuestionStartPayload,
	RoomStatePayload,
	ChatMessage,
	WsMessage,
} from "@/types/game";

const handlers: Record<string, (payload: unknown) => void> = {
	ROOM_STATE: (payload) =>
		useGameStore.getState().setRoomState(payload as RoomStatePayload),
	PLAYER_JOINED: (payload) =>
		useGameStore.getState().handlePlayerJoined(payload as PlayerJoinedPayload),
	PLAYER_LEFT: (payload) =>
		useGameStore.getState().handlePlayerLeft(payload as PlayerLeftPayload),
	QUESTION_START: (payload) =>
		useGameStore.getState().setQuestion(payload as QuestionStartPayload),
	ANSWER_ACK: (payload) =>
		useGameStore.getState().setAnswerResult(payload as AnswerAckPayload),
	QUESTION_END: (payload) => {
		const data = payload as QuestionEndPayload;
		useGameStore.getState().setQuestionEnd(data);
		useGameStore.getState().updateLeaderboard(data.leaderboard);
	},
	GAME_OVER: (payload) =>
		useGameStore.getState().setGameOver(payload as GameOverPayload),
	CHAT_MESSAGE: (payload) =>
		useGameStore.getState().addMessage(payload as ChatMessage),
	ERROR: (payload) => {
		const message =
			typeof payload === "object" && payload && "message" in payload
				? String((payload as { message: string }).message)
				: "Đã có lỗi xảy ra";
		useGameStore.getState().setAnswerResult({ error: message });
	},
};

export const dispatchWsEvent = (message: WsMessage) => {
	const handler = handlers[message.type];
	if (handler) {
		handler(message.payload);
	}
};
