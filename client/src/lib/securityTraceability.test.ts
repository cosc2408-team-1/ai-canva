import { describe, expect, it } from "vitest";
import {
  buildSecurityTraceGraph,
  traceBoxIds,
  traceConnectedEntityIds,
  traceEntity,
  type TraceArtifactSource,
} from "./securityTraceability.js";

const assetOutput = `artifact_type: AssetPackage
schema_version: "1.0"
assets:
  - id: AST-001
    name: Member accounts
    description: University identities used by members.
    evidence_refs: [EVID-001]
evidence_register:
  - id: EVID-001
    source: Project brief
    statement: Members use university accounts.`;

const requirementsOutput = `artifact_type: RequirementsPackage
schema_version: "1.0"
assets:
  - id: AST-001
    name: Member accounts
    evidence_refs: [EVID-001]
requirements:
  - id: REQ-001
    shall_statement: The system SHALL authenticate members.
    source_refs: [EVID-001]
    asset_refs: [AST-001]
evidence_register:
  - id: EVID-001
    statement: Members use university accounts.`;

const nistOutput = `artifact_type: NISTAssessmentPackage
schema_version: "1.0"
requirements_package:
  artifact_type: RequirementsPackage
  schema_version: "1.0"
  assets:
    - id: AST-001
      name: Member accounts
      evidence_refs: [EVID-001]
  requirements:
    - id: REQ-001
      shall_statement: The system SHALL authenticate members.
      source_refs: [EVID-001]
      asset_refs: [AST-001]
  evidence_register:
    - id: EVID-001
      statement: Members use university accounts.
findings:
  - id: GAP-001
    gap_statement: Authentication evidence should be reviewed.
    related_assets: [AST-001]
    related_evidence: [EVID-001]
    related_requirements: [REQ-001]
unmapped_requirements: []
unassessed_areas: []`;

const advisorOutput = `artifact_type: NextStepGuidance
schema_version: "1.0"
status: recommendation_ready
guidance_id: NEXT-001
recommended_next_step: Review authentication evidence.
relevant_upstream_references: [AST-001, EVID-001, REQ-001, GAP-001]`;

function source(boxId: string, boxType: TraceArtifactSource["boxType"], output: string): TraceArtifactSource {
  return { boxId, boxType, output };
}

const fullWorkflow = [
  source("asset-box", "assetmapper", assetOutput),
  source("requirements-box", "reqelicitor", requirementsOutput),
  source("nist-box", "nistgap", nistOutput),
  source("advisor-box", "securityadvisor", advisorOutput),
];

describe("security traceability graph", () => {
  it("canonicalizes preserved AST/EVID/REQ IDs and keeps every box/path occurrence", () => {
    const graph = buildSecurityTraceGraph(fullWorkflow);
    expect(graph.entities.filter(({ id }) => id === "AST-001")).toHaveLength(1);
    expect(graph.entities.filter(({ id }) => id === "EVID-001")).toHaveLength(1);
    expect(graph.entities.filter(({ id }) => id === "REQ-001")).toHaveLength(1);
    expect(traceEntity(graph, "AST-001")?.occurrences.map(({ boxId, sourcePath }) => [boxId, sourcePath])).toEqual([
      ["asset-box", "assets[0]"],
      ["requirements-box", "assets[0]"],
      ["nist-box", "requirements_package.assets[0]"],
    ]);
    expect(traceEntity(graph, "EVID-001")?.occurrences).toHaveLength(3);
    expect(traceEntity(graph, "REQ-001")?.occurrences.map(({ sourcePath }) => sourcePath)).toEqual([
      "requirements[0]",
      "requirements_package.requirements[0]",
    ]);
  });

  it("creates EVID-to-AST and EVID-to-REQ relations only from explicit refs", () => {
    const graph = buildSecurityTraceGraph(fullWorkflow.slice(0, 2));
    expect(graph.relations).toContainEqual({
      from: "EVID-001", to: "AST-001", kind: "supports", sourceBoxId: "asset-box", sourcePath: "assets[0].evidence_refs[0]",
    });
    expect(graph.relations).toContainEqual({
      from: "EVID-001", to: "REQ-001", kind: "supports", sourceBoxId: "requirements-box", sourcePath: "requirements[0].source_refs[0]",
    });
    expect(graph.relations).toContainEqual({
      from: "AST-001", to: "REQ-001", kind: "supports", sourceBoxId: "requirements-box", sourcePath: "requirements[0].asset_refs[0]",
    });
  });

  it("creates upstream-to-GAP and upstream-to-NEXT relations from reference arrays", () => {
    const graph = buildSecurityTraceGraph(fullWorkflow);
    expect(graph.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: "AST-001", to: "GAP-001", kind: "assessed_by", sourceBoxId: "nist-box" }),
      expect.objectContaining({ from: "EVID-001", to: "GAP-001", kind: "assessed_by", sourceBoxId: "nist-box" }),
      expect.objectContaining({ from: "REQ-001", to: "GAP-001", kind: "assessed_by", sourceBoxId: "nist-box" }),
      expect.objectContaining({ from: "GAP-001", to: "NEXT-001", kind: "informs_guidance", sourceBoxId: "advisor-box" }),
      expect.objectContaining({ from: "AST-001", to: "NEXT-001", kind: "informs_guidance", sourceBoxId: "advisor-box" }),
    ]));
  });

  it("traverses the full explicit workflow chain and returns its source boxes", () => {
    const graph = buildSecurityTraceGraph(fullWorkflow);
    expect(traceConnectedEntityIds(graph, "AST-001")).toEqual([
      "AST-001", "EVID-001", "REQ-001", "GAP-001", "NEXT-001",
    ]);
    expect(traceBoxIds(graph, "AST-001")).toEqual([
      "asset-box", "requirements-box", "nist-box", "advisor-box",
    ]);
  });

  it("is cycle-safe and produces deterministic traversal order", () => {
    const cyclic = `artifact_type: RequirementsPackage
schema_version: "1.0"
assets: []
requirements:
  - id: REQ-001
    related_requirements: [REQ-002]
  - id: REQ-002
    related_requirements: [REQ-001]
evidence_register: []`;
    const graph = buildSecurityTraceGraph([source("cycle-box", "reqelicitor", cyclic)]);
    expect(graph.relations.map(({ from, to }) => [from, to])).toEqual([["REQ-002", "REQ-001"], ["REQ-001", "REQ-002"]]);
    expect(traceConnectedEntityIds(graph, "REQ-001")).toEqual(["REQ-001", "REQ-002"]);
    expect(traceConnectedEntityIds(graph, "REQ-001")).toEqual(traceConnectedEntityIds(graph, "REQ-001"));
  });

  it("ignores undefined or malformed references without creating phantom entities", () => {
    const output = assetOutput
      .replace("[EVID-001]", "[EVID-999, AST-0, REQ-review]")
      .replace("evidence_register:\n  - id: EVID-001\n    source: Project brief\n    statement: Members use university accounts.", "evidence_register: []");
    const graph = buildSecurityTraceGraph([source("asset-box", "assetmapper", output)]);
    expect(graph.entities.map(({ id }) => id)).toEqual(["AST-001"]);
    expect(graph.relations).toEqual([]);
    expect(traceEntity(graph, "EVID-999")).toBeUndefined();
  });

  it("fails safely on malformed YAML and unsupported artifact types", () => {
    expect(buildSecurityTraceGraph([source("bad", "assetmapper", "artifact_type: AssetPackage\nassets: [")])).toEqual({ entities: [], relations: [] });
    expect(buildSecurityTraceGraph([source("wrong", "assetmapper", advisorOutput)])).toEqual({ entities: [], relations: [] });
  });

  it("does not infer a relation from similar prose", () => {
    const output = assetOutput
      .replace("description: University identities used by members.", "description: This text mentions EVID-001 but is not a reference field.")
      .replace("    evidence_refs: [EVID-001]\n", "");
    const graph = buildSecurityTraceGraph([source("asset-box", "assetmapper", output)]);
    expect(graph.entities.map(({ id }) => id)).toEqual(["AST-001", "EVID-001"]);
    expect(graph.relations).toEqual([]);
  });

  it("leaves exact artifact source strings unchanged", () => {
    const inputs = [...fullWorkflow];
    const outputsBefore = inputs.map(({ output }) => output);
    buildSecurityTraceGraph(inputs);
    expect(inputs.map(({ output }) => output)).toEqual(outputsBefore);
    expect(inputs).toEqual(fullWorkflow);
  });
});
