export function openAddBoxPanel(
  nodeCount: number,
  boardId: string | null,
  setSidebarOpen: (open: boolean) => void,
  setManualBoardId: (id: string | null) => void,
): void {
  if (nodeCount === 0) setManualBoardId(boardId);
  setSidebarOpen(true);
}
