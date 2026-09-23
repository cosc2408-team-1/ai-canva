import { useEffect } from "react";
import { create } from "zustand";

interface SecurityTraceState {
  selectedEntityId: string | null;
  selectedBoardId: string | null;
  selectEntity: (id: string, boardId: string | null) => void;
  clearSelection: () => void;
}

/** Ephemeral trace navigation state; deliberately has no persistence middleware. */
export const useSecurityTraceStore = create<SecurityTraceState>((set) => ({
  selectedEntityId: null,
  selectedBoardId: null,
  selectEntity: (id, boardId) => set({ selectedEntityId: id, selectedBoardId: boardId }),
  clearSelection: () => set({ selectedEntityId: null, selectedBoardId: null }),
}));

export function useBoardTraceSelection(boardId: string | null): string | null {
  const selectedEntityId = useSecurityTraceStore((state) => state.selectedEntityId);
  const selectedBoardId = useSecurityTraceStore((state) => state.selectedBoardId);
  const clearSelection = useSecurityTraceStore((state) => state.clearSelection);

  useEffect(() => {
    if (selectedEntityId && selectedBoardId !== boardId) clearSelection();
  }, [boardId, selectedBoardId, selectedEntityId, clearSelection]);
  useEffect(() => () => clearSelection(), [clearSelection]);

  return selectedBoardId === boardId ? selectedEntityId : null;
}
