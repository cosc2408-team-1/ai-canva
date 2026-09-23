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
});

async function render(value: SecurityTraceGraph = graph, selectedEntityId = "REQ-001") {
  await act(async () => root.render(createElement(SecurityTraceabilityInspector, {
    graph: value,
    selectedEntityId,
    onSelectEntity,
    onClose,
  })));
}

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

  it("closes from its control or Escape", async () => {
    await render();
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Close traceability inspector"]')!.click());
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
