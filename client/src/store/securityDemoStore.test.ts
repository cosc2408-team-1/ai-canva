// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { useSecurityDemoStore } from "./securityDemoStore.js";

describe("security demo store", () => {
  beforeEach(() => {
    useSecurityDemoStore.getState().finish();
    localStorage.clear();
  });

  it("starts, navigates, and finishes with clean transient state", () => {
    const store = useSecurityDemoStore.getState();
    store.start("board-a");
    expect(useSecurityDemoStore.getState()).toMatchObject({ active: true, step: 0, boardId: "board-a", manualTakeover: false });
    useSecurityDemoStore.getState().markManualTakeover();
    expect(useSecurityDemoStore.getState().manualTakeover).toBe(true);

    useSecurityDemoStore.getState().previous();
    expect(useSecurityDemoStore.getState().step).toBe(0);
    useSecurityDemoStore.getState().next();
    useSecurityDemoStore.getState().next();
    expect(useSecurityDemoStore.getState().step).toBe(2);
    useSecurityDemoStore.getState().previous();
    expect(useSecurityDemoStore.getState().step).toBe(1);
    useSecurityDemoStore.getState().finish();
    expect(useSecurityDemoStore.getState()).toMatchObject({ active: false, step: 0, boardId: null, manualTakeover: false });
  });

  it("keeps the final step active until the orchestrator explicitly finishes and is not persisted", () => {
    useSecurityDemoStore.getState().start(null);
    useSecurityDemoStore.getState().markManualTakeover();
    useSecurityDemoStore.setState({ step: 3 });
    useSecurityDemoStore.getState().next();

    expect(useSecurityDemoStore.getState()).toMatchObject({ active: true, step: 3 });
    useSecurityDemoStore.getState().finish();
    expect(useSecurityDemoStore.getState()).toMatchObject({ active: false, step: 0, boardId: null, manualTakeover: false });
    expect(localStorage.length).toBe(0);
  });
});
