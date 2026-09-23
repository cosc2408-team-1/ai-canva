import { create } from "zustand";

interface SecurityTraceState {
  selectedEntityId: string | null;
  selectEntity: (id: string) => void;
  clearSelection: () => void;
}

/** Ephemeral trace navigation state; deliberately has no persistence middleware. */
export const useSecurityTraceStore = create<SecurityTraceState>((set) => ({
  selectedEntityId: null,
  selectEntity: (id) => set({ selectedEntityId: id }),
  clearSelection: () => set({ selectedEntityId: null }),
}));
