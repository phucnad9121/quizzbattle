"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/use-toast";
import { dispatchWsEvent } from "@/lib/ws-events";
import { useAuthStore } from "@/store/authStore";
import type { ConnectionStatus, WsMessage } from "@/types/game";

const MAX_RETRIES = 5;
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];

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
		if (manualCloseRef.current) return;

		if (retryCountRef.current >= MAX_RETRIES) {
			setStatus("failed");
			toast({
				title: "Lỗi kết nối",
				description: "Không thể kết nối lại sau 5 lần thử. Vui lòng reload trang.",
				variant: "destructive",
			});
			return;
		}

		const delay = RETRY_DELAYS_MS[retryCountRef.current] ?? 4000;
		retryCountRef.current += 1;
		
		setStatus("reconnecting");
		
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

		if (retryCountRef.current === 0) {
			setStatus("connecting");
		}
		
		const url = buildWsUrl(roomCode, accessToken);
		const ws = new WebSocket(url);
		wsRef.current = ws;

		ws.onopen = () => {
			console.log("WS Connected!");
			retryCountRef.current = 0;
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
			console.error("WS Error");
		};

		ws.onclose = () => {
			console.warn("WS Closed");
			if (!manualCloseRef.current) {
				setStatus("disconnected");
				scheduleReconnect();
			}
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
