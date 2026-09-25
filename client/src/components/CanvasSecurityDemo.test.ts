// @vitest-environment happy-dom
import { act, createElement, useContext, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBoardStore } from "../store/boardStore.js";
import { useSecurityDemoStore } from "../store/securityDemoStore.js";
import { useSecurityTraceStore } from "../store/securityTraceStore.js";
import { deriveMicrosoftSecurityLens } from "../lib/microsoftSecurityLens.js";
import { createBoardTemplate, findJennieRunPlan } from "../lib/boardTemplates.js";
import { buildSecurityDemoTraceGraph, findSecurityWorkflow } from "../lib/securityDemo.js";
import { openAddBoxPanel } from "../lib/sidebarActions.js";
import { BOX_TYPES, type BoxType } from "../types.js";

vi.mock("@xyflow/react", async () => {
  const React = await import("react");
  const { SecurityTraceContext } = await import("./SecurityTraceContext.js");
  function ReactFlow({ children, nodes = [], onNodesChange }: {
    children?: ReactNode;
    nodes?: Array<{ style?: { opacity?: number } }>;
    onNodesChange?: (changes: Array<{ id: string; type: string; selected?: boolean }>) => void;
  }) {
    const traceContext = useContext(SecurityTraceContext);
    return React.createElement("div", {
      className: "react-flow",
      "data-testid": "flow-nodes",
      "data-opacities": JSON.stringify(nodes.map((node) => node.style?.opacity ?? 1)),
    },
      children,
      React.createElement("button", {
        type: "button",
        onClick: () => traceContext?.selectEntity("REQ-001"),
      }, "Select REQ-001"),
      React.createElement("button", {
        type: "button",
        onClick: () => traceContext?.selectEntity("EVID-001"),
      }, "Select EVID-001"),
      React.createElement("button", {
        type: "button",
        onClick: () => onNodesChange?.([{ id: "box-0", type: "select", selected: true }]),
      }, "Select ordinary node"),
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

function CanvasWithAddBoxAction({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [sidebarOpen, setSidebarOpen] = useState(initiallyOpen);
  return createElement("div", {},
    createElement("button", {
      type: "button",
      onClick: () => openAddBoxPanel(
        useBoardStore.getState().nodes.length,
        "board-a",
        setSidebarOpen,
        vi.fn(),
        () => useSecurityTraceStore.getState().clearSelection(),
      ),
    }, "+ Add Box"),
    createElement("button", {
      type: "button",
      onClick: () => setSidebarOpen(true),
    }, "Reopen sidebar"),
    createElement("span", { "data-testid": "add-box-open" }, String(sidebarOpen)),
    createElement(Canvas, { onTraceModeEnter: () => setSidebarOpen(false) }),
  );
}

let container: HTMLDivElement;
let root: Root;
const initialBoxData = useBoardStore.getState().boxData;
const initialNodes = useBoardStore.getState().nodes;
const initialEdges = useBoardStore.getState().edges;
const noMatchRequirementsOutput = `artifact_type: RequirementsPackage
schema_version: "1.0"
requirements:
  - id: REQ-001
    shall_statement: "Authentication is required."
    source_refs: [EVID-002]
evidence_register:
  - id: EVID-002
    statement: "The system uses authentication."`;
const keyVaultAssetOutput = `artifact_type: AssetPackage
schema_version: "1.0"
assets:
  - id: AST-001
    name: API key store
    description: "Stores API keys in secure secret storage."
    evidence_refs: [EVID-001]
evidence_register:
  - id: EVID-001
    statement: "API keys are stored in secure secret storage."`;

function setRetargetFixture() {
  const boxData = useBoardStore.getState().boxData;
  useBoardStore.setState({
    boxData: {
      ...boxData,
      "box-1": { ...boxData["box-1"], output: keyVaultAssetOutput },
      "box-2": { ...boxData["box-2"], output: noMatchRequirementsOutput },
    },
  });
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  useBoardStore.setState({
    boxData: initialBoxData,
    nodes: initialNodes,
    edges: initialEdges,
    currentBoardId: "board-a",
  });
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
  it("closes Add Box for a manual trace selection without changing ordinary node selection", async () => {
    await act(async () => root.render(createElement(CanvasWithAddBoxAction, { initiallyOpen: true })));
    await selectEntity("Select ordinary node");
    expect(container.querySelector('[data-testid="add-box-open"]')?.textContent).toBe("true");

    await selectEntity("Select REQ-001");
    expect(container.querySelector('[data-testid="add-box-open"]')?.textContent).toBe("false");
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");
    expect(container.querySelector('[data-testid="traceability-inspector"]')).not.toBeNull();
  });

  it("closes Add Box when the already selected trace ID is clicked again", async () => {
    await act(async () => root.render(createElement(CanvasWithAddBoxAction)));
    await selectEntity("Select REQ-001");
    await selectEntity("Reopen sidebar");
    expect(container.querySelector('[data-testid="add-box-open"]')?.textContent).toBe("true");

    await selectEntity("Select REQ-001");
    expect(container.querySelector('[data-testid="add-box-open"]')?.textContent).toBe("false");
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");
    expect(container.querySelector('[data-testid="traceability-inspector"]')).not.toBeNull();
  });

  it("closes Add Box when the Guided Demo enters visual traceability", async () => {
    await act(async () => root.render(createElement(CanvasWithAddBoxAction, { initiallyOpen: true })));
    await startAtTraceStep();

    expect(container.querySelector('[data-testid="add-box-open"]')?.textContent).toBe("false");
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");
    expect(useSecurityDemoStore.getState().active).toBe(true);
  });

  it("closes Add Box when the Guided Demo enters Lens and keeps the demo active", async () => {
    await act(async () => root.render(createElement(CanvasWithAddBoxAction)));
    await startAtTraceStep();
    await selectEntity("+ Add Box");
    expect(container.querySelector('[data-testid="add-box-open"]')?.textContent).toBe("true");

    await selectEntity("Next");
    expect(container.querySelector('[data-testid="add-box-open"]')?.textContent).toBe("false");
    expect(container.querySelector("#microsoft-security-lens-tab")?.getAttribute("aria-selected")).toBe("true");
    expect(useSecurityDemoStore.getState().active).toBe(true);
  });

  it("closes Add Box on the manual-takeover Lens step without retargeting", async () => {
    await act(async () => root.render(createElement(CanvasWithAddBoxAction)));
    await startAtTraceStep();
    await selectEntity("Select REQ-001");
    await selectEntity("Reopen sidebar");

    await selectEntity("Next");
    expect(container.querySelector('[data-testid="add-box-open"]')?.textContent).toBe("false");
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");
    expect(useSecurityDemoStore.getState().active).toBe(true);
  });

  it("closes Traceability and clears spotlight when Add Box opens, then permits reopening", async () => {
    await act(async () => root.render(createElement(CanvasWithAddBoxAction)));
    await selectEntity("Select REQ-001");

    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");
    expect(container.querySelector('[data-testid="traceability-inspector"]')).not.toBeNull();
    expect(JSON.parse(container.querySelector<HTMLElement>("[data-testid='flow-nodes']")!.dataset.opacities!)).toContain(0.42);

    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "+ Add Box")!.click());

    expect(container.querySelector('[data-testid="add-box-open"]')?.textContent).toBe("true");
    expect(useSecurityTraceStore.getState().selectedEntityId).toBeNull();
    expect(container.querySelector('[data-testid="traceability-inspector"]')).toBeNull();
    expect(JSON.parse(container.querySelector<HTMLElement>("[data-testid='flow-nodes']")!.dataset.opacities!)).toEqual([1, 1, 1, 1, 1]);

    await selectEntity("Select REQ-001");
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");
    expect(container.querySelector('[data-testid="traceability-inspector"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="add-box-open"]')?.textContent).toBe("false");
  });

  it("resets Lens to Traceability when Add Box clears the selection", async () => {
    await act(async () => root.render(createElement(CanvasWithAddBoxAction)));
    await selectEntity("Select REQ-001");
    await act(async () => container.querySelector<HTMLButtonElement>("#microsoft-security-lens-tab")!.click());
    expect(container.querySelector("#microsoft-security-lens-tab")?.getAttribute("aria-selected")).toBe("true");

    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "+ Add Box")!.click());

    expect(useSecurityTraceStore.getState().selectedEntityId).toBeNull();
    expect(container.querySelector('[data-testid="traceability-inspector"]')).toBeNull();
    expect(container.querySelector('[data-testid="add-box-open"]')?.textContent).toBe("true");

    await selectEntity("Select REQ-001");
    expect(container.querySelector("#traceability-tab")?.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector("#microsoft-security-lens-tab")?.getAttribute("aria-selected")).toBe("false");
  });

  it("keeps the Guided Demo active while Add Box clears its transient trace selection", async () => {
    await act(async () => root.render(createElement(CanvasWithAddBoxAction)));
    await startAtTraceStep();
    expect(useSecurityDemoStore.getState().active).toBe(true);
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");

    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "+ Add Box")!.click());

    expect(container.querySelector('[data-testid="add-box-open"]')?.textContent).toBe("true");
    expect(useSecurityTraceStore.getState().selectedEntityId).toBeNull();
    expect(container.querySelector('[data-testid="traceability-inspector"]')).toBeNull();
    expect(useSecurityDemoStore.getState().active).toBe(true);
  });

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

  it("keeps a same-ID manual takeover through Lens without retargeting to a matching asset", async () => {
    setRetargetFixture();
    await mountCanvas();
    await startAtTraceStep();
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");

    const workflow = findSecurityWorkflow(useBoardStore.getState().nodes, useBoardStore.getState().edges)!;
    const graph = buildSecurityDemoTraceGraph(workflow, useBoardStore.getState().boxData);
    expect(deriveMicrosoftSecurityLens(graph, "REQ-001").matches).toHaveLength(0);
    expect(deriveMicrosoftSecurityLens(graph, "AST-001").matches.map(({ capability }) => capability.name)).toContain("Azure Key Vault");

    await selectEntity("Select REQ-001");
    expect(useSecurityDemoStore.getState().manualTakeover).toBe(true);
    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Next")!.click());

    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");
    expect(container.querySelector("#microsoft-security-lens-tab")?.getAttribute("aria-selected")).toBe("true");
    expect(container.textContent).toContain("No Microsoft capability mapping is shown for this item");
    expect(useSecurityDemoStore.getState().manualTakeover).toBe(true);

    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Finish")!.click());

    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");
    expect(useSecurityDemoStore.getState().manualTakeover).toBe(false);
    expect(container.querySelector('[data-testid="traceability-inspector"]')).not.toBeNull();
  });

  it("keeps a different manually selected entity through Lens and Finish", async () => {
    await mountCanvas();
    await startAtTraceStep();
    await selectEntity("Select EVID-001");
    expect(useSecurityDemoStore.getState().manualTakeover).toBe(true);

    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Next")!.click());

    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("EVID-001");
    expect(container.querySelector("#microsoft-security-lens-tab")?.getAttribute("aria-selected")).toBe("true");
    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Finish")!.click());

    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("EVID-001");
  });

  it("retargets an untouched demo to a Lens match and clears the demo-owned selection on Finish", async () => {
    setRetargetFixture();
    await mountCanvas();
    await startAtTraceStep();
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("REQ-001");

    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Next")!.click());

    expect(useSecurityDemoStore.getState().manualTakeover).toBe(false);
    expect(useSecurityTraceStore.getState().selectedEntityId).toBe("AST-001");
    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Finish")!.click());

    expect(useSecurityTraceStore.getState().selectedEntityId).toBeNull();
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

describe("Jennie template run control", () => {
  function templateFixture() {
    let index = 0;
    return createBoardTemplate(
      "jennie-showcase",
      () => `jennie-${++index}`,
      (type: BoxType) => ({
        content: "",
        output: "",
        prompt: BOX_TYPES[type].defaultPrompt,
        systemPrompt: BOX_TYPES[type].defaultSystemPrompt,
        status: "idle",
      }),
    );
  }

  it("runs all seven workers in order from one click", async () => {
    const template = templateFixture();
    const runBox = vi.fn(async (id: string) => {
      const current = useBoardStore.getState();
      useBoardStore.setState({
        boxData: {
          ...current.boxData,
          [id]: { ...current.boxData[id], output: "generated", status: "done" },
        },
      });
    });
    useBoardStore.setState({
      ...template,
      currentBoardId: "board-jennie",
      runBox,
    });
    await mountCanvas();

    const button = [...container.querySelectorAll("button")]
      .find((candidate) => candidate.textContent === "▶ Run Jennie's review")!;
    expect(runBox).not.toHaveBeenCalled();
    await act(async () => button.click());

    expect(runBox.mock.calls.map(([id]) => id)).toEqual(
      findJennieRunPlan(template.nodes, template.edges)!.map(({ id }) => id),
    );
    expect(container.textContent).toContain("Review generated. Check each result before using it.");
  });

  it("stops at the first failed worker instead of running downstream boxes", async () => {
    const template = templateFixture();
    const plan = findJennieRunPlan(template.nodes, template.edges)!;
    const runBox = vi.fn(async (id: string) => {
      const current = useBoardStore.getState();
      useBoardStore.setState({
        boxData: {
          ...current.boxData,
          [id]: {
            ...current.boxData[id],
            status: id === plan[1].id ? "error" : "done",
            output: id === plan[1].id ? "" : "generated",
            error: id === plan[1].id ? "Provider unavailable" : undefined,
          },
        },
      });
    });
    useBoardStore.setState({ ...template, currentBoardId: "board-jennie", runBox });
    await mountCanvas();
    const button = [...container.querySelectorAll("button")]
      .find((candidate) => candidate.textContent === "▶ Run Jennie's review")!;
    await act(async () => button.click());

    expect(runBox.mock.calls.map(([id]) => id)).toEqual(plan.slice(0, 2).map(({ id }) => id));
    expect(container.textContent).toContain("Stopped at Threat Modeler: Provider unavailable");
  });
});
