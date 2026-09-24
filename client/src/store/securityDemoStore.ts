import { create } from "zustand";

export type SecurityDemoStep = 0 | 1 | 2 | 3;

interface SecurityDemoState {
  active: boolean;
  step: SecurityDemoStep;
  boardId: string | null;
  manualTakeover: boolean;
  start: (boardId: string | null) => void;
  next: () => void;
  previous: () => void;
  finish: () => void;
  markManualTakeover: () => void;
}

export const useSecurityDemoStore = create<SecurityDemoState>((set) => ({
  active: false,
  step: 0,
  boardId: null,
  manualTakeover: false,
  start: (boardId) => set({ active: true, step: 0, boardId, manualTakeover: false }),
  next: () => set((state) => {
    if (!state.active || state.step === 3) return state;
    return { step: (state.step + 1) as SecurityDemoStep };
  }),
  previous: () => set((state) => state.active && state.step > 0
    ? { step: (state.step - 1) as SecurityDemoStep }
    : state),
  finish: () => set({ active: false, step: 0, boardId: null, manualTakeover: false }),
  markManualTakeover: () => set({ manualTakeover: true }),
}));
