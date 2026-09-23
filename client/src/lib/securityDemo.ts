import {
  buildSecurityTraceGraph,
  type SecurityTraceGraph,
  type TraceArtifactSource,
  type TraceEntity,
} from "./securityTraceability.js";
import { deriveMicrosoftSecurityLens } from "./microsoftSecurityLens.js";

export interface SecurityDemoNode {
  id: string;
  type?: string | null;
  data?: { boxType?: unknown };
}

export interface SecurityDemoEdge {
  source: string;
  target: string;
}

export interface SecurityDemoWorkflow {
  projectDescriptionId: string;
  assetMapperId: string;
  requirementsElicitorId: string;
  nistGapCheckerId: string;
  securityAdvisorId: string;
}

export interface SecurityDemoArtifactBox {
  boxId: string;
  boxType: "assetmapper" | "reqelicitor" | "nistgap" | "securityadvisor";
  output: string;
}

export interface SecurityDemoFocus {
  entityId: string | null;
  view: "traceability" | "microsoft-security-lens";
}

export interface SecurityDemoSelectionOwner {
  entityId: string;
  boardId: string | null;
}

export interface SecurityDemoSelectionTransition {
  owner: SecurityDemoSelectionOwner | null;
  shouldSelect: boolean;
}

type ArtifactOutputs = Record<string, { output?: string } | undefined>;

const WORKFLOW_TYPES = ["idea", "assetmapper", "reqelicitor", "nistgap", "securityadvisor"] as const;
const ARTIFACT_STAGES = [
  ["assetMapperId", "assetmapper"],
  ["requirementsElicitorId", "reqelicitor"],
  ["nistGapCheckerId", "nistgap"],
  ["securityAdvisorId", "securityadvisor"],
] as const;
function nodeType(node: SecurityDemoNode): string | undefined {
  const type = node.type || node.data?.boxType;
  return typeof type === "string" ? type : undefined;
}

export function findSecurityWorkflow(
  nodes: readonly SecurityDemoNode[],
  edges: readonly SecurityDemoEdge[],
): SecurityDemoWorkflow | null {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const nextById = new Map<string, string[]>();
  edges.forEach(({ source, target }) => {
    nextById.set(source, [...(nextById.get(source) || []), target]);
  });

  const search = (currentId: string, stageIndex: number, path: string[]): string[] | null => {
    if (stageIndex === WORKFLOW_TYPES.length) return path;
    for (const nextId of nextById.get(currentId) || []) {
      const nextNode = byId.get(nextId);
      if (!nextNode || nodeType(nextNode) !== WORKFLOW_TYPES[stageIndex]) continue;
      const result = search(nextId, stageIndex + 1, [...path, nextId]);
      if (result) return result;
    }
    return null;
  };

  for (const node of nodes) {
    if (nodeType(node) !== WORKFLOW_TYPES[0]) continue;
    const path = search(node.id, 1, [node.id]);
    if (!path) continue;
    return {
      projectDescriptionId: path[0],
      assetMapperId: path[1],
      requirementsElicitorId: path[2],
      nistGapCheckerId: path[3],
      securityAdvisorId: path[4],
    };
  }
  return null;
}

export function findDemoArtifactBox(
  workflow: SecurityDemoWorkflow,
  outputs: ArtifactOutputs,
): SecurityDemoArtifactBox | null {
  for (const [idKey, boxType] of ARTIFACT_STAGES) {
    const boxId = workflow[idKey];
    const output = outputs[boxId]?.output;
    if (typeof output === "string" && output.trim()) return { boxId, boxType, output };
  }
  return null;
}

export function buildSecurityDemoTraceGraph(
  workflow: SecurityDemoWorkflow,
  outputs: ArtifactOutputs,
): SecurityTraceGraph {
  const sources: TraceArtifactSource[] = ARTIFACT_STAGES.flatMap(([idKey, boxType]) => {
    const boxId = workflow[idKey];
    const output = outputs[boxId]?.output;
    return typeof output === "string" && output.trim() ? [{ boxId, boxType, output }] : [];
  });
  return buildSecurityTraceGraph(sources);
}

function hasDirectRelation(graph: SecurityTraceGraph, id: string): boolean {
  return graph.relations.some(({ from, to }) => from === id || to === id);
}

export function findBestTraceEntity(graph: SecurityTraceGraph): TraceEntity | null {
  const preferences: readonly ((entity: TraceEntity) => boolean)[] = [
    (entity) => entity.kind === "requirement" && hasDirectRelation(graph, entity.id),
    (entity) => entity.kind === "finding" && hasDirectRelation(graph, entity.id),
    (entity) => entity.kind === "evidence" && hasDirectRelation(graph, entity.id),
    (entity) => entity.kind === "asset" && hasDirectRelation(graph, entity.id),
    (entity) => entity.kind === "guidance" && hasDirectRelation(graph, entity.id),
  ];
  return preferences.flatMap((matches) => graph.entities.filter(matches))[0] || null;
}

export function resolveSecurityDemoSelection(
  source: "demo" | "manual",
  entityId: string,
  boardId: string | null,
  selectedEntityId: string | null,
  selectedBoardId: string | null,
  owner: SecurityDemoSelectionOwner | null,
): SecurityDemoSelectionTransition {
  if (source === "manual") return { owner: null, shouldSelect: true };

  const alreadySelected = selectedEntityId === entityId && selectedBoardId === boardId;
  const alreadyDemoOwned = owner?.entityId === entityId && owner.boardId === boardId;
  if (alreadySelected) {
    return { owner: alreadyDemoOwned ? owner : null, shouldSelect: false };
  }
  return { owner: { entityId, boardId }, shouldSelect: true };
}

export function isSecurityDemoOwnedSelection(
  owner: SecurityDemoSelectionOwner | null,
  selectedEntityId: string | null,
  selectedBoardId: string | null,
): boolean {
  return Boolean(
    owner
    && owner.entityId === selectedEntityId
    && owner.boardId === selectedBoardId,
  );
}

export function findBestLensEntity(
  graph: SecurityTraceGraph,
  preferredEntityId?: string | null,
): TraceEntity | null {
  const candidates = graph.entities.flatMap((entity) => {
    const result = deriveMicrosoftSecurityLens(graph, entity.id);
    return result.matches.length ? [{ entity, matchCount: result.matches.length }] : [];
  });
  const readable = candidates.filter(({ matchCount }) => matchCount <= 3);
  const preferred = readable.find(({ entity }) => entity.id === preferredEntityId);
  return preferred?.entity || readable[0]?.entity || candidates[0]?.entity || null;
}

export function resolveSecurityDemoFocus(
  step: 0 | 1 | 2 | 3,
  graph: SecurityTraceGraph,
  selectedEntityId?: string | null,
): SecurityDemoFocus {
  if (step < 2) return { entityId: null, view: "traceability" };
  if (step === 2) return { entityId: findBestTraceEntity(graph)?.id || null, view: "traceability" };
  const lensTarget = findBestLensEntity(graph, selectedEntityId);
  const selectedExists = graph.entities.some(({ id }) => id === selectedEntityId);
  return {
    entityId: lensTarget?.id || (selectedExists ? selectedEntityId! : findBestTraceEntity(graph)?.id || null),
    view: "microsoft-security-lens",
  };
}

export function securityWorkflowStageIds(workflow: SecurityDemoWorkflow): string[] {
  return [
    workflow.projectDescriptionId,
    workflow.assetMapperId,
    workflow.requirementsElicitorId,
    workflow.nistGapCheckerId,
    workflow.securityAdvisorId,
  ];
}
