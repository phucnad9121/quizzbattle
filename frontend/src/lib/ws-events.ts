import { useGameStore } from "@/store/gameStore";
import type {
	AnswerAckPayload,
	GameOverPayload,
	PlayerJoinedPayload,
	PlayerLeftPayload,
	QuestionEndPayload,
	QuestionStartPayload,
	RoomStatePayload,
	WsMessage,
} from "@/types/game";

const handlers: Record<string, (payload: unknown) => void> = {
	ROOM_STATE: (payload) =>
		useGameStore.getState().setRoomState(payload as RoomStatePayload),
	PLAYER_JOINED: (payload) =>
		useGameStore.getState().handlePlayerJoined(payload as PlayerJoinedPayload),
	PLAYER_LEFT: (payload) =>
		useGameStore.getState().setQuestion(payload as QuestionStartPayload),
	QUESTION_START: (payload) =>
		useGameStore.getState().setAnswerResult(payload as AnswerAckPayload),
	ANSWER_ACK: (payload) =>
		const data = payload as QuestionEndPayload;
		useGameStore.getState().updateLeaderboard(data.leaderboard);
	QUESTION_END: (payload) =>
		useGameStore.getState().handleQuestionEnd(payload as QuestionEndPayload),
		useGameStore.getState().setGameOver(payload as GameOverPayload),
		useGameStore.getState().handleGameOver(payload as GameOverPayload),
	ERROR: (payload) => {
		const message =
			typeof payload === "object" && payload && "message" in payload
				? String((payload as { message: string }).message)
		useGameStore.getState().setAnswerResult({ error: message });
		useGameStore.getState().handleError(message);
	},
};

export const dispatchWsEvent = (message: WsMessage) => {
	const handler = handlers[message.type];
	if (handler) {
		handler(message.payload);
	}
};
