import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import type { SecurityTraceGraph } from "./securityTraceability.js";
import {
  deriveTraceEdgePresentation,
  deriveTraceNodePresentation,
  traceabilityGroups,
} from "./securityTraceabilityPresentation.js";

const graph: SecurityTraceGraph = {
  entities: [
    { id: "REQ-001", kind: "requirement", label: "Authenticate members", occurrences: [] },
    { id: "EVID-001", kind: "evidence", label: "University accounts", occurrences: [] },
    { id: "AST-001", kind: "asset", label: "Member accounts", occurrences: [] },
    { id: "GAP-001", kind: "finding", label: "Review authentication", occurrences: [] },
    { id: "NEXT-001", kind: "guidance", label: "Confirm ownership", occurrences: [] },
    { id: "REQ-002", kind: "requirement", label: "Unrelated requirement", occurrences: [] },
  ],
  relations: [
    { from: "EVID-001", to: "REQ-001", kind: "supports", sourceBoxId: "req-box", sourcePath: "requirements[0].source_refs[0]" },
    { from: "AST-001", to: "REQ-001", kind: "supports", sourceBoxId: "req-box", sourcePath: "requirements[0].asset_refs[0]" },
    { from: "REQ-001", to: "GAP-001", kind: "assessed_by", sourceBoxId: "nist-box", sourcePath: "findings[0].related_requirements[0]" },
    { from: "GAP-001", to: "NEXT-001", kind: "informs_guidance", sourceBoxId: "advisor-box", sourcePath: "relevant_upstream_references[0]" },
  ],
};

describe("security traceability presentation", () => {
  it("groups only entities reachable through explicit relations", () => {
    const groups = traceabilityGroups(graph, "REQ-001");
    expect(groups.map(({ heading, entities }) => [heading, entities.map(({ id }) => id)])).toEqual([
      ["Evidence / supported by", ["EVID-001"]],
      ["Related assets", ["AST-001"]],
      ["Assessed by findings", ["GAP-001"]],
      ["Used by guidance", ["NEXT-001"]],
    ]);
    expect(groups.flatMap(({ entities }) => entities.map(({ id }) => id))).not.toContain("REQ-002");
  });

  it("derives highlighted/dimmed nodes without mutating board nodes or React Flow selection", () => {
    const nodes: Node[] = [
      { id: "req-box", type: "reqelicitor", position: { x: 0, y: 0 }, data: {}, selected: true },
      { id: "asset-box", type: "assetmapper", position: { x: 100, y: 0 }, data: {} },
      { id: "other-box", type: "research", position: { x: 200, y: 0 }, data: {} },
      { id: "area-1", type: "area", position: { x: 0, y: 100 }, data: {} },
    ];
    const before = structuredClone(nodes);
    const presentation = deriveTraceNodePresentation(nodes, new Set(["req-box", "asset-box"]), new Set(["req-box"]));

    expect(presentation[0].style?.opacity).toBe(1);
    expect(presentation[0].style?.boxShadow).toContain("3px");
    expect(presentation[0].selected).toBe(true);
    expect(presentation[1].style?.boxShadow).toContain("2px");
    expect(presentation[2].style?.opacity).toBe(0.42);
    expect(presentation[3]).toBe(nodes[3]);
    expect(nodes).toEqual(before);
  });

  it("highlights only existing workflow edges within traced boxes without mutation", () => {
    const edges: Edge[] = [
      { id: "trace-edge", source: "req-box", target: "asset-box" },
      { id: "outside-edge", source: "req-box", target: "other-box", selected: true, style: { stroke: "#64748b" } },
    ];
    const before = structuredClone(edges);
    const presentation = deriveTraceEdgePresentation(edges, new Set(["req-box", "asset-box"]));

    expect(presentation[0].style).toMatchObject({ opacity: 1, stroke: "#0f766e", strokeWidth: 3 });
    expect(presentation[1].style).toMatchObject({ opacity: 0.22, stroke: "#64748b" });
    expect(presentation[1].selected).toBe(true);
    expect(edges).toEqual(before);
  });
});
