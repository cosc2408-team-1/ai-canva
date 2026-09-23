// @vitest-environment happy-dom
import { act, createElement, useContext, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBoardStore } from "../store/boardStore.js";
import { useSecurityDemoStore } from "../store/securityDemoStore.js";
import { useSecurityTraceStore } from "../store/securityTraceStore.js";

vi.mock("@xyflow/react", async () => {
  const React = await import("react");
  const { SecurityTraceContext } = await import("./SecurityTraceContext.js");
  function ReactFlow({ children }: { children?: ReactNode }) {
    const traceContext = useContext(SecurityTraceContext);
    return React.createElement("div", { className: "react-flow" },
      children,
      React.createElement("button", {
        type: "button",
        onClick: () => traceContext?.selectEntity("REQ-001"),
      }, "Select REQ-001"),
      React.createElement("button", {
        type: "button",
        onClick: () => traceContext?.selectEntity("EVID-001"),
      }, "Select EVID-001"),
    );
  }
  const Container = ({ children }: { children?: ReactNode }) => React.createElement("div", {}, children);
  return {
    ReactFlow,
    Background: () => null,
    BackgroundVariant: { Dots: "dots" },
    Controls: () => null,
    MiniMap: () => null,
    Panel: Container,
    useReactFlow: () => ({ screenToFlowPosition: (point: { x: number; y: number }) => point }),
    useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  };
});

vi.mock("./BoxNode.js", () => ({ default: () => null }));
vi.mock("./AreaNode.js", () => ({ default: () => null }));
vi.mock("./Cursors.js", () => ({ default: () => null }));
vi.mock("../store/boardStore.js", async () => {
  const { create } = await import("zustand");
  const nodes = ["idea", "assetmapper", "reqelicitor", "nistgap", "securityadvisor"]
    .map((type, index) => ({ id: `box-${index}`, type, position: { x: index * 100, y: 0 }, data: {} }));
  const edges = nodes.slice(1).map((node, index) => ({
    id: `edge-${index}`,
    source: nodes[index].id,
    target: node.id,
  }));
  const requirementOutput = `artifact_type: RequirementsPackage
schema_version: "1.0"
requirements:
  - id: REQ-001
    shall_statement: Require MFA for member authentication.
    source_refs: [EVID-001]
evidence_register:
  - id: EVID-001
    statement: Members sign in to manage their account.`;
  return {
    useBoardStore: create(() => ({
      nodes,
      edges,
      currentBoardId: "board-a",
      boxData: { "box-2": { output: requirementOutput } },
      onNodesChange: vi.fn(),
      onEdgesChange: vi.fn(),
      onConnect: vi.fn(),
      updateCursorPosition: vi.fn(),
      cleanupPresence: vi.fn(),
      placeChatbot: vi.fn(),
      addArea: vi.fn(),
    })),
  };
});

import Canvas from "./Canvas.js";

let container: HTMLDivElement;
let root: Root;
const initialBoxData = useBoardStore.getState().boxData;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  useBoardStore.setState({ boxData: initialBoxData });
  useSecurityDemoStore.getState().finish();
  useSecurityTraceStore.getState().clearSelection();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  useSecurityDemoStore.getState().finish();
  useSecurityTraceStore.getState().clearSelection();
  container.remove();
});

async function mountCanvas() {
  await act(async () => root.render(createElement(Canvas)));
}

async function startAtTraceStep() {
  await act(async () => useSecurityDemoStore.getState().start("board-a"));
  await act(async () => useSecurityDemoStore.setState({ step: 2 }));
}

async function pressEscape() {
  await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  })));
}

async function selectEntity(label: string) {
  const button = [...container.querySelectorAll("button")].find((candidate) => candidate.textContent === label)!;
  await act(async () => button.click());
}

describe("Canvas guided demo ownership and Lens state", () => {
  it("clears a demo-owned selection when Escape ends the demo", async () => {
    await mountCanvas();
    await startAtTraceStep();
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");

    await pressEscape();

    expect(useSecurityDemoStore.getState().active).toBe(false);
    expect(useSecurityTraceStore.getState().selectedEntityId).toBeNull();
  });

  it("preserves a same-ID manual selection when Escape ends the demo", async () => {
    await mountCanvas();
    await startAtTraceStep();
    await selectEntity("Select REQ-001");

    await pressEscape();

    expect(useSecurityDemoStore.getState().active).toBe(false);
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");
    expect(container.querySelector('[data-testid="traceability-inspector"]')).not.toBeNull();
  });

  it("preserves a different manual selection when Escape ends the demo", async () => {
    await mountCanvas();
    await startAtTraceStep();
    await selectEntity("Select EVID-001");

    await pressEscape();

    expect(useSecurityDemoStore.getState().active).toBe(false);
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("EVID-001");
    expect(container.querySelector('[data-testid="traceability-inspector"]')?.textContent).toContain("EVID-001");
  });

  it("keeps Inspector Escape close behavior when the demo is inactive", async () => {
    await mountCanvas();
    await selectEntity("Select REQ-001");
    expect(container.querySelector('[data-testid="traceability-inspector"]')).not.toBeNull();

    await pressEscape();

    expect(useSecurityTraceStore.getState().selectedEntityId).toBeNull();
    expect(container.querySelector('[data-testid="traceability-inspector"]')).toBeNull();
  });

  it.each(["Finish", "Close guided demo"])('%s preserves a manual same-ID selection', async (control) => {
    await mountCanvas();
    await startAtTraceStep();
    await selectEntity("Select REQ-001");
    await act(async () => useSecurityDemoStore.setState({ step: 3 }));
    const button = container.querySelector<HTMLButtonElement>(`button${control === "Close guided demo" ? '[aria-label="Close guided demo"]' : ""}`)!;
    if (control === "Finish") {
      const finish = [...container.querySelectorAll("button")].find((candidate) => candidate.textContent === "Finish")!;
      await act(async () => finish.click());
    } else {
      await act(async () => button.click());
    }

    expect(useSecurityDemoStore.getState().active).toBe(false);
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");
  });

  it("reopens the Inspector through an explicit Lens-step action", async () => {
    await mountCanvas();
    await startAtTraceStep();
    await act(async () => useSecurityDemoStore.setState({ step: 3 }));
    const close = container.querySelector<HTMLButtonElement>('button[aria-label="Close traceability inspector"]')!;
    await act(async () => close.click());
    expect(container.querySelector('[data-testid="traceability-inspector"]')).toBeNull();

    const reopen = [...container.querySelectorAll("button")].find((candidate) => candidate.textContent === "Reopen Inspector")!;
    await act(async () => reopen.click());

    expect(container.querySelector('[data-testid="traceability-inspector"]')).not.toBeNull();
    expect(container.querySelector('#microsoft-security-lens-tab')?.getAttribute("aria-selected")).toBe("true");
  });

  it("shows an isolated MFA Lens target without the related-trace fallback", async () => {
    const currentBoxData = useBoardStore.getState().boxData;
    const output = currentBoxData["box-2"].output!;
    useBoardStore.setState({
      boxData: {
        ...currentBoxData,
        "box-2": { ...currentBoxData["box-2"], output: output.replace("    source_refs: [EVID-001]\n", "") },
      },
    });
    await mountCanvas();
    await startAtTraceStep();
    expect(useSecurityTraceStore.getState().selectedEntityId).toBeNull();
    expect(container.textContent).toContain("No direct relationship is available yet");
    const skip = [...container.querySelectorAll("button")].find((candidate) => candidate.textContent === "Skip")!;
    await act(async () => skip.click());

    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");
    expect(container.querySelector('[data-testid="traceability-inspector"]')).not.toBeNull();
    expect(container.querySelector('#microsoft-security-lens-tab')?.getAttribute("aria-selected")).toBe("true");
    expect(container.textContent).not.toContain("No current entity is available for the Lens");
    expect(container.textContent).not.toContain("No current trace target is available");
  });
});
