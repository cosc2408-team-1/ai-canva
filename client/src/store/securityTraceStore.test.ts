// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { useSecurityTraceStore } from "./securityTraceStore.js";

describe("security trace selection store", () => {
  beforeEach(() => {
    localStorage.clear();
    useSecurityTraceStore.getState().clearSelection();
  });

  it("selects an entity, replaces the selection, and clears it", () => {
    const { selectEntity, clearSelection } = useSecurityTraceStore.getState();

    selectEntity("AST-001");
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("AST-001");
    selectEntity("REQ-001");
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");
    clearSelection();
    expect(useSecurityTraceStore.getState().selectedEntityId).toBeNull();
  });

  it("does not write trace selection to browser storage", () => {
    const { selectEntity, clearSelection } = useSecurityTraceStore.getState();
    selectEntity("EVID-001");
    clearSelection();

    expect(localStorage.length).toBe(0);
  });
});
