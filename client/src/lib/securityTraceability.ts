import { parseDocument } from "yaml";
import type { SecurityArtifactBoxType } from "../types.js";

export interface TraceArtifactSource {
  boxId: string;
  boxType: SecurityArtifactBoxType;
  output: string;
}

export type TraceEntityKind = "asset" | "evidence" | "requirement" | "finding" | "guidance";

export interface TraceOccurrence {
  boxId: string;
  boxType: SecurityArtifactBoxType;
  sourcePath: string;
  label: string;
  detail?: string;
}

export interface TraceEntity {
  id: string;
  kind: TraceEntityKind;
  label: string;
  detail?: string;
  occurrences: TraceOccurrence[];
}

export type TraceRelationKind = "supports" | "assessed_by" | "informs_guidance" | "related_to";

export interface TraceRelation {
  from: string;
  to: string;
  kind: TraceRelationKind;
  sourceBoxId: string;
  sourcePath: string;
}

export interface SecurityTraceGraph {
  entities: TraceEntity[];
  relations: TraceRelation[];
}

type ArtifactRecord = Record<string, unknown>;
type IdPrefix = "AST" | "EVID" | "REQ" | "GAP" | "NEXT";
type PendingRelation = Omit<TraceRelation, "from" | "to"> & { from: string; to: string };

const ID_PATTERNS: Record<IdPrefix, RegExp> = {
  AST: /^AST-0*[1-9]\d*$/,
  EVID: /^EVID-0*[1-9]\d*$/,
  REQ: /^REQ-0*[1-9]\d*$/,
  GAP: /^GAP-0*[1-9]\d*$/,
  NEXT: /^NEXT-0*[1-9]\d*$/,
};

const ARTIFACT_TYPES: Record<SecurityArtifactBoxType, string> = {
  assetmapper: "AssetPackage",
  reqelicitor: "RequirementsPackage",
  nistgap: "NISTAssessmentPackage",
  securityadvisor: "NextStepGuidance",
  threatModeler: "ThreatModel",
  riskScorer: "RiskRegister",
  irPlanner: "IncidentResponsePlan",
};

const REFERENCE_FIELDS = new Set([
  "source_refs",
  "evidence_refs",
  "asset_refs",
  "related_assets",
  "related_evidence",
  "related_requirements",
  "relevant_upstream_references",
]);

function record(value: unknown): ArtifactRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as ArtifactRecord
    : null;
}

function strings(value: unknown, path: string): Array<{ id: string; path: string }> {
  if (typeof value === "string") return [{ id: value, path }];
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => typeof entry === "string"
    ? [{ id: entry, path: `${path}[${index}]` }]
    : []);
}

function prefix(id: string): IdPrefix | null {
  const match = /^(AST|EVID|REQ|GAP|NEXT)-/.exec(id);
  if (!match) return null;
  const namespace = match[1] as IdPrefix;
  return ID_PATTERNS[namespace].test(id) ? namespace : null;
}

function kindFor(namespace: IdPrefix): TraceEntityKind {
  switch (namespace) {
    case "AST": return "asset";
    case "EVID": return "evidence";
    case "REQ": return "requirement";
    case "GAP": return "finding";
    case "NEXT": return "guidance";
  }
}

function firstText(value: ArtifactRecord, keys: readonly string[]): string {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (Array.isArray(candidate)) {
      const text = candidate.find((item): item is string => typeof item === "string" && Boolean(item.trim()));
      if (text) return text;
    }
  }
  return "";
}

function identifier(value: ArtifactRecord, keys: readonly string[], expected: IdPrefix): string | null {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && prefix(candidate) === expected) return candidate;
  }
  return null;
}

function addOccurrence(
  entities: Map<string, TraceEntity>,
  id: string,
  box: TraceArtifactSource,
  sourcePath: string,
  label: string,
  detail = "",
) {
  const namespace = prefix(id);
  if (!namespace) return;
  let entity = entities.get(id);
  if (!entity) {
    entity = { id, kind: kindFor(namespace), label: label || id, ...(detail ? { detail } : {}), occurrences: [] };
    entities.set(id, entity);
  }
  entity.occurrences.push({ boxId: box.boxId, boxType: box.boxType, sourcePath, label: label || id, ...(detail ? { detail } : {}) });
}

function addDefinitions(
  entities: Map<string, TraceEntity>,
  box: TraceArtifactSource,
  artifact: ArtifactRecord,
  basePath: string,
  field: string,
  idKeys: readonly string[],
  expected: IdPrefix,
  labelKeys: readonly string[],
  detailKeys: readonly string[],
) {
  const value = artifact[field];
  if (!Array.isArray(value)) return;
  value.forEach((entry, index) => {
    const item = record(entry);
    if (!item) return;
    const id = identifier(item, idKeys, expected);
    if (!id) return;
    addOccurrence(entities, id, box, `${basePath}${field}[${index}]`, firstText(item, labelKeys), firstText(item, detailKeys));
  });
}

function addAdvisorDefinition(entities: Map<string, TraceEntity>, box: TraceArtifactSource, artifact: ArtifactRecord) {
  const id = typeof artifact.guidance_id === "string" && prefix(artifact.guidance_id) === "NEXT" ? artifact.guidance_id : null;
  if (id) addOccurrence(entities, id, box, "guidance_id", firstText(artifact, ["recommended_next_step", "interview_summary", "status"]), firstText(artifact, ["reason"]));
}

function collectRefs(value: unknown, path: string, output: Array<{ field: string; id: string; path: string }> = []): Array<{ field: string; id: string; path: string }> {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectRefs(entry, `${path}[${index}]`, output));
    return output;
  }
  const item = record(value);
  if (!item) return output;
  for (const [key, child] of Object.entries(item)) {
    const childPath = path ? `${path}.${key}` : key;
    if (REFERENCE_FIELDS.has(key)) {
      for (const reference of strings(child, childPath)) {
        if (prefix(reference.id)) output.push({ field: key, ...reference });
      }
    }
    collectRefs(child, childPath, output);
  }
  return output;
}

function relationForReference(
  owner: IdPrefix,
  field: string,
  reference: IdPrefix,
): { from: "reference" | "owner"; to: "reference" | "owner"; kind: TraceRelationKind } | null {
  if (owner === "AST" && field === "evidence_refs" && reference === "EVID") {
    return { from: "reference", to: "owner", kind: "supports" };
  }
  if (owner === "REQ") {
    if (field === "source_refs" && reference === "EVID") return { from: "reference", to: "owner", kind: "supports" };
    if (field === "asset_refs" && reference === "AST") return { from: "reference", to: "owner", kind: "supports" };
    if (field === "related_requirements" && reference === "REQ") return { from: "reference", to: "owner", kind: "related_to" };
  }
  if (owner === "GAP") {
    if (field === "related_assets" && reference === "AST") return { from: "reference", to: "owner", kind: "assessed_by" };
    if (["related_evidence", "evidence_refs"].includes(field) && reference === "EVID") return { from: "reference", to: "owner", kind: "assessed_by" };
    if (field === "related_requirements" && reference === "REQ") return { from: "reference", to: "owner", kind: "assessed_by" };
  }
  if (owner === "NEXT" && field === "relevant_upstream_references" && ["AST", "EVID", "REQ", "GAP"].includes(reference)) {
    return { from: "reference", to: "owner", kind: "informs_guidance" };
  }
  return null;
}

function addRelationsFromDefinitions(
  relations: PendingRelation[],
  box: TraceArtifactSource,
  value: unknown,
  basePath: string,
  field: string,
  ownerPrefix: IdPrefix,
  ownerKeys: readonly string[],
) {
  if (!Array.isArray(value)) return;
  value.forEach((entry, index) => {
    const item = record(entry);
    const ownerId = item && identifier(item, ownerKeys, ownerPrefix);
    if (!item || !ownerId) return;
    const refs = collectRefs(item, `${basePath}${field}[${index}]`);
    refs.forEach(({ field: referenceField, id, path }) => {
      const referencePrefix = prefix(id)!;
      const relation = relationForReference(ownerPrefix, referenceField, referencePrefix);
      if (!relation) return;
      relations.push({
        from: relation.from === "owner" ? ownerId : id,
        to: relation.to === "owner" ? ownerId : id,
        kind: relation.kind,
        sourceBoxId: box.boxId,
        sourcePath: path,
      });
    });
  });
}

function parseSource(source: TraceArtifactSource): ArtifactRecord | null {
  try {
    const document = parseDocument(source.output, { uniqueKeys: true });
    if (document.errors.length) return null;
    const artifact = record(document.toJS({ maxAliasCount: 0 }));
    return artifact?.artifact_type === ARTIFACT_TYPES[source.boxType] ? artifact : null;
  } catch {
    return null;
  }
}

function collectSource(
  source: TraceArtifactSource,
  artifact: ArtifactRecord,
  entities: Map<string, TraceEntity>,
  relations: PendingRelation[],
) {
  const addPackage = (value: ArtifactRecord, basePath: string) => {
    addDefinitions(entities, source, value, basePath, "assets", ["id", "asset_id"], "AST", ["name", "asset_name"], ["description", "asset_type", "type"]);
    addDefinitions(entities, source, value, basePath, "evidence_register", ["id", "evidence_id"], "EVID", ["statement", "description", "source"], ["source", "verification_state"]);
    addDefinitions(entities, source, value, basePath, "requirements", ["id", "requirement_id"], "REQ", ["shall_statement", "statement", "requirement"], ["priority", "confidence"]);
    addRelationsFromDefinitions(relations, source, value.assets, basePath, "assets", "AST", ["id", "asset_id"]);
    addRelationsFromDefinitions(relations, source, value.requirements, basePath, "requirements", "REQ", ["id", "requirement_id"]);
  };

  if (source.boxType === "assetmapper" || source.boxType === "reqelicitor") {
    addPackage(artifact, "");
  } else if (source.boxType === "nistgap") {
    const nested = record(artifact.requirements_package);
    if (nested) addPackage(nested, "requirements_package.");
    addDefinitions(entities, source, artifact, "", "findings", ["id", "gap_id"], "GAP", ["gap_statement", "finding", "observation", "description", "summary"], ["confidence", "severity"]);
    addRelationsFromDefinitions(relations, source, artifact.findings, "", "findings", "GAP", ["id", "gap_id"]);
  } else {
    addAdvisorDefinition(entities, source, artifact);
    if (prefix(typeof artifact.guidance_id === "string" ? artifact.guidance_id : "") === "NEXT") {
      collectRefs(artifact, "").forEach(({ field, id, path }) => {
        const referencePrefix = prefix(id)!;
        const relation = relationForReference("NEXT", field, referencePrefix);
        if (!relation) return;
        relations.push({
          from: relation.from === "owner" ? artifact.guidance_id as string : id,
          to: relation.to === "owner" ? artifact.guidance_id as string : id,
          kind: relation.kind,
          sourceBoxId: source.boxId,
          sourcePath: path,
        });
      });
    }
  }
}

/** Builds an ephemeral, deterministic graph from exact generated artifact YAML. */
export function buildSecurityTraceGraph(sources: readonly TraceArtifactSource[]): SecurityTraceGraph {
  const entities = new Map<string, TraceEntity>();
  const pending: PendingRelation[] = [];
  for (const source of sources) {
    const artifact = parseSource(source);
    if (artifact) collectSource(source, artifact, entities, pending);
  }
  const relations: TraceRelation[] = [];
  const seenRelations = new Set<string>();
  for (const relation of pending) {
    if (!entities.has(relation.from) || !entities.has(relation.to)) continue;
    const key = `${relation.from}\u0000${relation.to}\u0000${relation.kind}\u0000${relation.sourceBoxId}\u0000${relation.sourcePath}`;
    if (seenRelations.has(key)) continue;
    seenRelations.add(key);
    relations.push(relation);
  }
  return { entities: [...entities.values()], relations };
}

export function traceEntity(graph: SecurityTraceGraph, id: string): TraceEntity | undefined {
  return graph.entities.find((entity) => entity.id === id);
}

/** Returns the full undirected connected component in deterministic breadth-first order. */
export function traceConnectedEntityIds(graph: SecurityTraceGraph, id: string): string[] {
  if (!traceEntity(graph, id)) return [];
  const visited = new Set<string>([id]);
  const queue = [id];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const relation of graph.relations) {
      const neighbor = relation.from === current ? relation.to : relation.to === current ? relation.from : null;
      if (neighbor && !visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return queue;
}

export function traceBoxIds(graph: SecurityTraceGraph, id: string): string[] {
  const connected = new Set(traceConnectedEntityIds(graph, id));
  const boxIds = new Set<string>();
  for (const entity of graph.entities) {
    if (!connected.has(entity.id)) continue;
    for (const occurrence of entity.occurrences) boxIds.add(occurrence.boxId);
  }
  return [...boxIds];
}
