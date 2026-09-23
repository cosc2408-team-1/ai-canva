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
  { kind: "evidence", heading: "Evidence / supported by" },
  { kind: "asset", heading: "Related assets" },
  { kind: "requirement", heading: "Related requirements" },
  { kind: "finding", heading: "Assessed by findings" },
  { kind: "guidance", heading: "Used by guidance" },
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
    const related = graph.entities.find((entity) => entity.id === relatedId);
    return related?.kind === "evidence" ? "Supports this item" : "Referenced by this item";
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

export function deriveTraceEdgePresentation(edges: Edge[], tracedBoxIds: ReadonlySet<string>): Edge[] {
  if (!tracedBoxIds.size) return edges;
  return edges.map((edge) => {
    const tracedWorkflowEdge = tracedBoxIds.has(edge.source) && tracedBoxIds.has(edge.target);
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
