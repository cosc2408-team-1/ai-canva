import { create } from "zustand";

/**
 * Lightweight, non-persisted store tracking the logged-in user's cumulative
 * LLM token usage in this session (seeded from Firestore on login, then
 * incremented as each generation completes). Kept separate from the board
 * store because it is account-level state, not board state.
 */
interface TokenState {
  totalTokens: number;
  setTotal: (n: number) => void;
  addTokens: (n: number) => void;
  reset: () => void;
}

export const useTokenStore = create<TokenState>((set) => ({
  totalTokens: 0,
  setTotal: (n) => set({ totalTokens: n }),
  addTokens: (n) => set((s) => ({ totalTokens: s.totalTokens + n })),
  reset: () => set({ totalTokens: 0 }),
}));
