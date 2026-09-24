import { describe, expect, it, vi } from "vitest";
import { openAddBoxPanel } from "./sidebarActions.js";

describe("Add Box sidebar action", () => {
  it.each([false, true])("leaves the panel open when it starts %s", (initialOpen) => {
    let open = initialOpen;
    const setSidebarOpen = vi.fn((value: boolean) => { open = value; });
    const setManualBoardId = vi.fn();

    openAddBoxPanel(4, "board-a", setSidebarOpen, setManualBoardId);

    expect(setSidebarOpen).toHaveBeenCalledWith(true);
    expect(open).toBe(true);
    expect(setManualBoardId).not.toHaveBeenCalled();
  });

  it("opens the panel and preserves manual mode for an empty board", () => {
    const setSidebarOpen = vi.fn();
    const setManualBoardId = vi.fn();

    openAddBoxPanel(0, "board-empty", setSidebarOpen, setManualBoardId);

    expect(setSidebarOpen).toHaveBeenCalledWith(true);
    expect(setManualBoardId).toHaveBeenCalledWith("board-empty");
  });
});
