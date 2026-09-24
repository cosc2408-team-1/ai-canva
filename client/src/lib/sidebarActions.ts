export function openAddBoxPanel(
  nodeCount: number,
  boardId: string | null,
  setSidebarOpen: (open: boolean) => void,
  setManualBoardId: (id: string | null) => void,
  clearTraceSelection: () => void,
): void {
  clearTraceSelection();
  if (nodeCount === 0) setManualBoardId(boardId);
  setSidebarOpen(true);
}
