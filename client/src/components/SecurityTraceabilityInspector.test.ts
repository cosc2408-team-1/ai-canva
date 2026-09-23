// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SecurityTraceGraph } from "../lib/securityTraceability.js";
import SecurityTraceabilityInspector from "./SecurityTraceabilityInspector.js";

const graph: SecurityTraceGraph = {
  entities: [
    { id: "REQ-001", kind: "requirement", label: "Authenticate members", occurrences: [] },
    { id: "EVID-001", kind: "evidence", label: "University accounts", detail: "Project brief", occurrences: [] },
    { id: "AST-001", kind: "asset", label: "Member accounts", occurrences: [] },
    { id: "GAP-001", kind: "finding", label: "Review authentication", occurrences: [] },
    { id: "NEXT-001", kind: "guidance", label: "Confirm ownership", occurrences: [] },
  ],
  relations: [
    { from: "EVID-001", to: "REQ-001", kind: "supports", sourceBoxId: "req-box", sourcePath: "requirements[0].source_refs[0]" },
    { from: "AST-001", to: "REQ-001", kind: "supports", sourceBoxId: "req-box", sourcePath: "requirements[0].asset_refs[0]" },
    { from: "REQ-001", to: "GAP-001", kind: "assessed_by", sourceBoxId: "nist-box", sourcePath: "findings[0].related_requirements[0]" },
    { from: "GAP-001", to: "NEXT-001", kind: "informs_guidance", sourceBoxId: "advisor-box", sourcePath: "relevant_upstream_references[0]" },
  ],
};

let container: HTMLDivElement;
let root: Root;
const onSelectEntity = vi.fn<(id: string) => void>();
const onClose = vi.fn<() => void>();

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  onSelectEntity.mockClear();
  onClose.mockClear();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function render(value: SecurityTraceGraph = graph, selectedEntityId = "REQ-001") {
  await act(async () => root.render(createElement(SecurityTraceabilityInspector, {
    graph: value,
    selectedEntityId,
    onSelectEntity,
    onClose,
  })));
}

const lensGraph: SecurityTraceGraph = {
  ...graph,
  entities: graph.entities.map((item) => {
    if (item.id === "REQ-001") return { ...item, label: "Member authentication requirement" };
    if (item.id === "EVID-001") return { ...item, detail: "The provider API key is stored server-side." };
    return item;
  }),
};

describe("SecurityTraceabilityInspector", () => {
  it("renders the selected entity and related groups from the graph", async () => {
    await render();

    expect(container.textContent).toContain("Traceability");
    expect(container.textContent).toContain("REQ-001");
    expect(container.textContent).toContain("Authenticate members");
    expect(container.textContent).toContain("Evidence");
    expect(container.textContent).toContain("EVID-001");
    expect(container.textContent).toContain("Assets");
    expect(container.textContent).toContain("Findings");
    expect(container.textContent).toContain("Guidance");
    expect(container.textContent).toContain("Supports this item");

    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label^="Trace EVID-001"]')!.click());
    expect(onSelectEntity).toHaveBeenCalledWith("EVID-001");

    await render(graph, "EVID-001");
    expect(container.textContent).toContain("References this item");
  });

  it("shows a neutral empty state when the entity has no relations", async () => {
    await render({
      entities: [{ id: "NEXT-001", kind: "guidance", label: "Review evidence", occurrences: [] }],
      relations: [],
    }, "NEXT-001");

    expect(container.textContent).toContain("No explicitly linked entities were found for this item.");
  });

  it("opens the Microsoft Security Lens and shows evidence-linked capability matches", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await render(lensGraph);

    const traceabilityTab = container.querySelector<HTMLButtonElement>("#traceability-tab")!;
    const lensTab = container.querySelector<HTMLButtonElement>("#microsoft-security-lens-tab")!;
    const traceabilityPanel = container.querySelector<HTMLDivElement>("#traceability-panel")!;
    const lensPanel = container.querySelector<HTMLDivElement>("#microsoft-security-lens-panel")!;
    expect(traceabilityTab.getAttribute("aria-selected")).toBe("true");
    expect(lensTab.getAttribute("aria-selected")).toBe("false");
    expect(traceabilityTab.getAttribute("aria-controls")).toBe(traceabilityPanel.id);
    expect(lensTab.getAttribute("aria-controls")).toBe(lensPanel.id);
    expect(traceabilityPanel.hidden).toBe(false);
    expect(lensPanel.hidden).toBe(true);

    await act(async () => lensTab.click());
    expect(lensTab.getAttribute("aria-selected")).toBe("true");
    expect(traceabilityPanel.hidden).toBe(true);
    expect(lensPanel.hidden).toBe(false);
    expect(container.textContent).toContain("Microsoft Entra ID");
    expect(container.textContent).toContain("Azure Key Vault");
    expect(container.textContent).toContain("Matched because");
    expect(container.textContent).toContain("REQ-001 · authentication");
    expect(container.textContent).toContain("EVID-001 · API key");
    expect(container.textContent).toContain("not a compliance determination or Microsoft endorsement");
    expect(container.querySelector('a[target="_blank"][rel="noopener noreferrer"]')).not.toBeNull();
    expect(onSelectEntity).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    await act(async () => traceabilityTab.click());
    expect(container.textContent).toContain("Member authentication requirement");
    expect(container.textContent).toContain("Evidence");
    expect(onSelectEntity).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("shows the neutral Lens empty state when no supported direct signal matches", async () => {
    await render({
      entities: [{ id: "NEXT-001", kind: "guidance", label: "Confirm the project owner", occurrences: [] }],
      relations: [],
    }, "NEXT-001");

    await act(async () => container.querySelector<HTMLButtonElement>("#microsoft-security-lens-tab")!.click());
    expect(container.textContent).toContain("No Microsoft capability mapping is shown for this item from the current trace evidence.");
  });

  it("updates Lens content when the selected trace entity changes", async () => {
    await render(lensGraph);
    await act(async () => container.querySelector<HTMLButtonElement>("#microsoft-security-lens-tab")!.click());
    expect(container.textContent).toContain("Azure Key Vault");

    await render(lensGraph, "NEXT-001");
    expect(container.textContent).toContain("Microsoft Entra ID");
    expect(container.textContent).not.toContain("Azure Key Vault");
  });

  it("supports arrow and Home/End keyboard navigation for the tabs", async () => {
    await render();
    const traceabilityTab = container.querySelector<HTMLButtonElement>("#traceability-tab")!;
    const lensTab = container.querySelector<HTMLButtonElement>("#microsoft-security-lens-tab")!;

    await act(async () => traceabilityTab.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(lensTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(lensTab);

    await act(async () => lensTab.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true })));
    expect(traceabilityTab.getAttribute("aria-selected")).toBe("true");

    await act(async () => traceabilityTab.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
    expect(lensTab.getAttribute("aria-selected")).toBe("true");
  });

  it("closes from its control or Escape", async () => {
    await render();
    await act(async () => container.querySelector<HTMLButtonElement>("#microsoft-security-lens-tab")!.click());
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Close traceability inspector"]')!.click());
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
