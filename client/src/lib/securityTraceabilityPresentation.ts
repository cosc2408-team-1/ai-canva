import type { Edge, Node } from "@xyflow/react";
import {
  traceConnectedEntityIds,
  type SecurityTraceGraph,
  type TraceEntity,
} from "./securityTraceability.js";

export interface TraceabilityGroup {
  kind: TraceEntity["kind"];
  heading: string;
  entities: TraceEntity[];
}

const GROUPS: Array<{ kind: TraceEntity["kind"]; heading: string }> = [
  { kind: "evidence", heading: "Evidence" },
  { kind: "asset", heading: "Assets" },
  { kind: "requirement", heading: "Requirements" },
  { kind: "finding", heading: "Findings" },
  { kind: "guidance", heading: "Guidance" },
];

export function traceabilityGroups(graph: SecurityTraceGraph, selectedId: string): TraceabilityGroup[] {
  const connectedIds = new Set(traceConnectedEntityIds(graph, selectedId));
  const related = graph.entities.filter((entity) => entity.id !== selectedId && connectedIds.has(entity.id));
  return GROUPS.flatMap(({ kind, heading }) => {
    const entities = related.filter((entity) => entity.kind === kind);
    return entities.length ? [{ kind, heading, entities }] : [];
  });
}

export function traceRelationshipLabel(graph: SecurityTraceGraph, selectedId: string, relatedId: string): string {
  const relation = graph.relations.find(({ from, to }) =>
    (from === selectedId && to === relatedId) || (from === relatedId && to === selectedId));
  if (!relation) return "Connected through explicit artifact references";

  if (relation.kind === "supports") {
    return relation.from === relatedId ? "Supports this item" : "References this item";
  }
  if (relation.kind === "related_to") return "Related requirement";
  if (relation.kind === "assessed_by") {
    return relation.to === relatedId ? "Assessed by this finding" : "Referenced by this finding";
  }
  return relation.to === relatedId ? "Used by this guidance" : "Guidance references this item";
}

export function deriveTraceNodePresentation(
  nodes: Node[],
  tracedBoxIds: ReadonlySet<string>,
  selectedEntityBoxIds: ReadonlySet<string>,
): Node[] {
  if (!tracedBoxIds.size) return nodes;
  return nodes.map((node) => {
    if (node.type === "area") return node;
    const traced = tracedBoxIds.has(node.id);
    const selectedOccurrence = selectedEntityBoxIds.has(node.id);
    return {
      ...node,
      style: {
        ...node.style,
        opacity: traced ? 1 : 0.42,
        ...(traced ? {
          boxShadow: selectedOccurrence
            ? "0 0 0 3px rgba(13, 148, 136, 0.88), 0 4px 18px rgba(13, 148, 136, 0.28)"
            : "0 0 0 2px rgba(13, 148, 136, 0.58), 0 3px 12px rgba(13, 148, 136, 0.18)",
        } : {}),
      },
    };
  });
}

export function deriveTraceEdgePresentation(edges: Edge[], graph: SecurityTraceGraph, selectedId: string): Edge[] {
  const connectedIds = new Set(traceConnectedEntityIds(graph, selectedId));
  if (!connectedIds.size) return edges;
  const entities = new Map(graph.entities.map((entity) => [entity.id, entity]));
  const relatedBoxPairs = new Set<string>();
  for (const relation of graph.relations) {
    if (!connectedIds.has(relation.from) || !connectedIds.has(relation.to)) continue;
    if (!entities.get(relation.to)?.occurrences.some(({ boxId }) => boxId === relation.sourceBoxId)) continue;
    for (const { boxId } of entities.get(relation.from)?.occurrences || []) {
      if (boxId !== relation.sourceBoxId) relatedBoxPairs.add(`${boxId}\u0000${relation.sourceBoxId}`);
    }
  }
  return edges.map((edge) => {
    const tracedWorkflowEdge = relatedBoxPairs.has(`${edge.source}\u0000${edge.target}`);
    return {
      ...edge,
      style: {
        ...edge.style,
        opacity: tracedWorkflowEdge ? 1 : 0.22,
        ...(tracedWorkflowEdge ? { stroke: "#0f766e", strokeWidth: 3 } : {}),
      },
    };
  });
}
