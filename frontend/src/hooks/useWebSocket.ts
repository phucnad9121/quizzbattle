"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/use-toast";
import { dispatchWsEvent } from "@/lib/ws-events";
import { useAuthStore } from "@/store/authStore";
import type { ConnectionStatus, WsMessage } from "@/types/game";

const MAX_RETRIES = 5;
const RETRY_DELAYS_MS = [1000, 2000, 4000, 4000, 4000];

const buildWsUrl = (roomCode: string, token: string) => {
	const base = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";
	const trimmed = base.replace(/\/+$/, "");
	const prefix = trimmed.includes("/api/v1") ? trimmed : `${trimmed}/api/v1`;
	return `${prefix}/ws/${roomCode}?token=${token}`;
};

export const useWebSocket = (roomCode: string | null) => {
	const { accessToken } = useAuthStore();
	const [status, setStatus] = useState<ConnectionStatus>("disconnected");

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const retryCountRef = useRef(0);
	const manualCloseRef = useRef(false);
	const toastShownRef = useRef(false);

	const clearReconnectTimer = () => {
		if (reconnectTimerRef.current) {
			clearTimeout(reconnectTimerRef.current);
			reconnectTimerRef.current = null;
		}
	};

	const closeSocket = useCallback(() => {
		if (wsRef.current) {
			wsRef.current.onopen = null;
			wsRef.current.onmessage = null;
			wsRef.current.onerror = null;
			wsRef.current.onclose = null;
			wsRef.current.close();
			wsRef.current = null;
		}
	}, []);


	const scheduleReconnect = useCallback(() => {
		if (manualCloseRef.current) {
			return;
		}

		if (retryCountRef.current >= MAX_RETRIES) {
			return;
		}

		const delay = RETRY_DELAYS_MS[retryCountRef.current] ?? 4000;
		retryCountRef.current += 1;

		clearReconnectTimer();
		reconnectTimerRef.current = setTimeout(() => {
			connectRef.current();
		}, delay);
	}, []);

	const connectRef = useRef<() => void>(() => {});

	const connect = useCallback(() => {
		if (!roomCode || !accessToken) {
			return;
		}

		manualCloseRef.current = false;
		clearReconnectTimer();
		closeSocket();

		setStatus("connecting");
		const url = buildWsUrl(roomCode, accessToken);
		const ws = new WebSocket(url);
		wsRef.current = ws;

		ws.onopen = () => {
			retryCountRef.current = 0;
			toastShownRef.current = false;
			setStatus("connected");
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as WsMessage;
				if (data?.type) {
					dispatchWsEvent(data);
				}
			} catch {
				return;
			}
		};

		ws.onerror = () => {
			if (!toastShownRef.current) {
				toastShownRef.current = true;
				toast({
					title: "Mất kết nối, đang thử lại...",
				});
			}
		};

		ws.onclose = () => {
			setStatus("disconnected");
			if (!toastShownRef.current && !manualCloseRef.current) {
				toastShownRef.current = true;
				toast({
					title: "Mất kết nối, đang thử lại...",
				});
			}
			scheduleReconnect();
		};
	}, [accessToken, roomCode, scheduleReconnect]);

	// Store latest connect in ref to avoid circular dependency
	useEffect(() => {
		connectRef.current = connect;
	}, [connect]);

	useEffect(() => {
		if (!roomCode || !accessToken) {
			setStatus("disconnected");
			return;
		}

		connect();

		return () => {
			manualCloseRef.current = true;
			clearReconnectTimer();
			closeSocket();
		};
	}, [roomCode, accessToken]);

	const sendMessage = useCallback(
		(typeOrMessage: string | { type: string; payload?: any }, payload?: Record<string, unknown>) => {
			if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
				return;
			}
			
			let message: any;
			if (typeof typeOrMessage === "string") {
				message = payload ? { type: typeOrMessage, payload } : { type: typeOrMessage };
			} else {
				message = typeOrMessage;
			}
			
			wsRef.current.send(JSON.stringify(message));
		},
		[]
	);

	return {
		status,
		sendMessage,
	};
};
