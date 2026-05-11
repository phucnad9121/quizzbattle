"use client";

import { useGameStore } from "@/store/gameStore";

export const useGameState = () => {
	return useGameStore();
};
