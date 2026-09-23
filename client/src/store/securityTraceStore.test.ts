// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
import { useBoardTraceSelection, useSecurityTraceStore } from "./securityTraceStore.js";

describe("security trace selection store", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    localStorage.clear();
    useSecurityTraceStore.getState().clearSelection();
  });

  it("selects an entity, replaces the selection, and clears it", () => {
    const { selectEntity, clearSelection } = useSecurityTraceStore.getState();

    selectEntity("AST-001", "board-a");
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("AST-001");
    expect(useSecurityTraceStore.getState().selectedBoardId).toBe("board-a");
    selectEntity("REQ-001", "board-a");
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");
    clearSelection();
    expect(useSecurityTraceStore.getState().selectedEntityId).toBeNull();
    expect(useSecurityTraceStore.getState().selectedBoardId).toBeNull();
  });

  it("does not write trace selection to browser storage", () => {
    const { selectEntity, clearSelection } = useSecurityTraceStore.getState();
    selectEntity("EVID-001", "board-a");
    clearSelection();

    expect(localStorage.length).toBe(0);
  });

  it("clears same-named entity selection on board switch and Canvas unmount", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const View = ({ boardId }: { boardId: string }) =>
      createElement("span", null, useBoardTraceSelection(boardId) || "none");

    try {
      await act(async () => root.render(createElement(View, { boardId: "board-a" })));
      await act(async () => useSecurityTraceStore.getState().selectEntity("REQ-001", "board-a"));
      expect(container.textContent).toBe("REQ-001");

      await act(async () => root.render(createElement(View, { boardId: "board-b" })));
      expect(container.textContent).toBe("none");
      expect(useSecurityTraceStore.getState().selectedEntityId).toBeNull();

      await act(async () => useSecurityTraceStore.getState().selectEntity("REQ-001", "board-b"));
      expect(container.textContent).toBe("REQ-001");
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
    expect(useSecurityTraceStore.getState().selectedEntityId).toBeNull();
  });
});
