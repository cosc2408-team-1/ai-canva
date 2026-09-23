// @vitest-environment happy-dom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Edge, Node } from "@xyflow/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { summarizeSecurityArtifact } from "../lib/securityArtifactSummary.js";
import { buildSecurityTraceGraph, traceBoxIds, traceEntity } from "../lib/securityTraceability.js";
import { deriveTraceEdgePresentation, deriveTraceNodePresentation } from "../lib/securityTraceabilityPresentation.js";
import SecurityArtifactSummary from "./SecurityArtifactSummary.js";
import { SecurityTraceContext } from "./SecurityTraceContext.js";
import SecurityTraceabilityInspector from "./SecurityTraceabilityInspector.js";

const assetOutput = `artifact_type: AssetPackage
schema_version: "1.0"
assets:
  - id: AST-001
    name: Accounts
    evidence_refs: [EVID-001]
evidence_register:
  - id: EVID-001
    statement: Members use accounts.`;
const requirementsOutput = `artifact_type: RequirementsPackage
schema_version: "1.0"
assets:
  - id: AST-001
    name: Accounts
requirements:
  - id: REQ-001
    shall_statement: Authenticate members.
    source_refs: [EVID-001]
    asset_refs: [AST-001]
evidence_register:
  - id: EVID-001
    statement: Members use accounts.`;
const nistOutput = `artifact_type: NISTAssessmentPackage
schema_version: "1.0"
requirements_package:
  artifact_type: RequirementsPackage
  schema_version: "1.0"
  assets:
    - id: AST-001
      name: Accounts
  requirements:
    - id: REQ-001
      shall_statement: Authenticate members.
  evidence_register:
    - id: EVID-001
      statement: Members use accounts.
findings:
  - id: GAP-001
    gap_statement: Review authentication evidence.
    related_assets: [AST-001]
    evidence_refs: [EVID-001]
    related_requirements: [REQ-001]
unmapped_requirements: []
unassessed_areas: []`;
const advisorOutput = `artifact_type: NextStepGuidance
schema_version: "1.0"
status: recommendation_ready
guidance_id: NEXT-001
recommended_next_step: Review authentication evidence.
relevant_upstream_references: [GAP-001]`;

const graph = buildSecurityTraceGraph([
  { boxId: "asset-box", boxType: "assetmapper", output: assetOutput },
  { boxId: "req-box", boxType: "reqelicitor", output: requirementsOutput },
  { boxId: "nist-box", boxType: "nistgap", output: nistOutput },
  { boxId: "advisor-box", boxType: "securityadvisor", output: advisorOutput },
]);
const summary = summarizeSecurityArtifact("nistgap", nistOutput)!;
const nodes: Node[] = ["asset-box", "req-box", "nist-box", "advisor-box"].map((id) => ({ id, position: { x: 0, y: 0 }, data: {} }));
const edges: Edge[] = [
  { id: "asset-req", source: "asset-box", target: "req-box" },
  { id: "req-nist", source: "req-box", target: "nist-box" },
  { id: "nist-advisor", source: "nist-box", target: "advisor-box" },
  { id: "unrelated", source: "asset-box", target: "advisor-box" },
];

function Fixture() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedEntity = selectedId ? traceEntity(graph, selectedId) : undefined;
  const tracedBoxes = new Set(selectedEntity ? traceBoxIds(graph, selectedId!) : []);
  const selectedBoxes = new Set(selectedEntity?.occurrences.map(({ boxId }) => boxId) || []);
  const shownNodes = selectedEntity ? deriveTraceNodePresentation(nodes, tracedBoxes, selectedBoxes) : nodes;
  const shownEdges = selectedEntity ? deriveTraceEdgePresentation(edges, graph, selectedId!) : edges;

  return createElement(SecurityTraceContext.Provider, {
    value: { traceableEntityIds: new Set(graph.entities.map(({ id }) => id)), selectEntity: setSelectedId },
  },
  createElement(SecurityArtifactSummary, { summary, needsClarification: false }),
  ...shownNodes.map((node) => createElement("span", {
    key: node.id,
    "data-node-id": node.id,
    "data-shadow": node.style?.boxShadow || "",
    "data-opacity": node.style?.opacity ?? "",
  })),
  ...shownEdges.map((edge) => createElement("span", {
    key: edge.id,
    "data-edge-id": edge.id,
    "data-opacity": edge.style?.opacity ?? "",
  })),
  selectedEntity && selectedId ? createElement(SecurityTraceabilityInspector, {
    graph,
    selectedEntityId: selectedId,
    onSelectEntity: setSelectedId,
    onClose: () => setSelectedId(null),
  }) : null);
}

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(Fixture)));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

function nodeShadow(id: string) {
  return container.querySelector(`[data-node-id="${id}"]`)?.getAttribute("data-shadow");
}

function edgeOpacity(id: string) {
  return container.querySelector(`[data-edge-id="${id}"]`)?.getAttribute("data-opacity");
}

describe("GAP traceability flow", () => {
  it("navigates the NIST finding, highlights only supported workflow edges, and resets on close", async () => {
    await act(async () => container.querySelector<HTMLButtonElement>('button[data-trace-id="GAP-001"]')!.click());
    const inspector = container.querySelector('[aria-label="Traceability inspector"]')!;
    expect(inspector.querySelector("code")?.textContent).toBe("GAP-001");
    expect(inspector.textContent).toContain("AST-001");
    expect(inspector.textContent).toContain("EVID-001");
    expect(inspector.textContent).toContain("REQ-001");
    expect(nodeShadow("nist-box")).toContain("3px");
    expect(nodeShadow("asset-box")).toContain("2px");
    expect(edgeOpacity("asset-req")).toBe("1");
    expect(edgeOpacity("req-nist")).toBe("1");
    expect(edgeOpacity("nist-advisor")).toBe("1");
    expect(edgeOpacity("unrelated")).toBe("0.22");

    await act(async () => container.querySelector<HTMLButtonElement>('button[data-trace-id="EVID-001"]')!.click());
    expect(container.querySelector('[aria-label="Traceability inspector"] code')?.textContent).toBe("EVID-001");
    expect(nodeShadow("asset-box")).toContain("3px");
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label^="Trace REQ-001"]')!.click());
    expect(container.querySelector('[aria-label="Traceability inspector"] code')?.textContent).toBe("REQ-001");
    expect(nodeShadow("asset-box")).toContain("2px");

    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector('[aria-label="Traceability inspector"]')).toBeNull();
    expect(nodeShadow("nist-box")).toBe("");
    expect(edgeOpacity("unrelated")).toBe("");

    await act(async () => container.querySelector<HTMLButtonElement>('button[data-trace-id="GAP-001"]')!.click());
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Close traceability inspector"]')!.click());
    expect(container.querySelector('[aria-label="Traceability inspector"]')).toBeNull();
    expect(edgeOpacity("asset-req")).toBe("");
  });
});
