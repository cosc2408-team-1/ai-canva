import { describe, expect, it } from "vitest";
import {
  findBestLensEntity,
  findBestTraceEntity,
  findDemoArtifactBox,
  findSecurityWorkflow,
  resolveSecurityDemoFocus,
  type SecurityDemoWorkflow,
} from "./securityDemo.js";
import type { SecurityTraceGraph } from "./securityTraceability.js";

const workflow: SecurityDemoWorkflow = {
  projectDescriptionId: "project-box",
  assetMapperId: "asset-box",
  requirementsElicitorId: "requirements-box",
  nistGapCheckerId: "nist-box",
  securityAdvisorId: "advisor-box",
};

function nodes(types: string[]) {
  return types.map((type, index) => ({ id: `box-${index}`, type }));
}

describe("Security demo target selection", () => {
  it("detects only a connected Security Assessment path", () => {
    const path = nodes(["idea", "assetmapper", "reqelicitor", "nistgap", "securityadvisor"]);
    const edges = path.slice(1).map((node, index) => ({ source: path[index].id, target: node.id }));
    expect(findSecurityWorkflow(path, edges)).toEqual({
      projectDescriptionId: "box-0",
      assetMapperId: "box-1",
      requirementsElicitorId: "box-2",
      nistGapCheckerId: "box-3",
      securityAdvisorId: "box-4",
    });
    expect(findSecurityWorkflow(path, edges.slice(0, 3))).toBeNull();
    expect(findSecurityWorkflow([], [])).toBeNull();
  });

  it("uses the first available artifact output in workflow order", () => {
    expect(findDemoArtifactBox(workflow, {})).toBeNull();
    expect(findDemoArtifactBox(workflow, { "asset-box": { output: "  " } })).toBeNull();
    expect(findDemoArtifactBox(workflow, {
      "requirements-box": { output: "requirements yaml" },
      "nist-box": { output: "nist yaml" },
    })).toEqual({ boxId: "requirements-box", boxType: "reqelicitor", output: "requirements yaml" });
  });

  it("prefers a related requirement, then a related finding, without fixed IDs", () => {
    const graph: SecurityTraceGraph = {
      entities: [
        { id: "NEXT-044", kind: "guidance", label: "Next", occurrences: [] },
        { id: "GAP-902", kind: "finding", label: "Gap", occurrences: [] },
        { id: "REQ-777", kind: "requirement", label: "Requirement", occurrences: [] },
        { id: "AST-089", kind: "asset", label: "Asset", occurrences: [] },
      ],
      relations: [
        { from: "REQ-777", to: "GAP-902", kind: "assessed_by", sourceBoxId: "nist", sourcePath: "findings[0]" },
      ],
    };
    expect(findBestTraceEntity(graph)?.id).toBe("REQ-777");
    expect(findBestTraceEntity({ ...graph, relations: [] })?.id).toBe("AST-089");
    expect(findBestTraceEntity({ entities: [], relations: [] })).toBeNull();
  });

  it("chooses a deterministic readable Lens target and returns no match when none exists", () => {
    const graph: SecurityTraceGraph = {
      entities: [
        { id: "REQ-902", kind: "requirement", label: "Require MFA", occurrences: [] },
        { id: "EVID-003", kind: "evidence", label: "Store API keys in secret storage", occurrences: [] },
        { id: "AST-042", kind: "asset", label: "Member profiles", occurrences: [] },
      ],
      relations: [],
    };
    expect(findBestLensEntity(graph)?.id).toBe("REQ-902");
    expect(findBestLensEntity(graph, "EVID-003")?.id).toBe("EVID-003");
    expect(findBestLensEntity({ entities: [graph.entities[2]], relations: [] })).toBeNull();
  });

  it("uses existing trace and Lens targets for the final two demo steps", () => {
    const graph: SecurityTraceGraph = {
      entities: [
        { id: "AST-209", kind: "asset", label: "Member records", occurrences: [] },
        { id: "REQ-712", kind: "requirement", label: "Require MFA for member authentication", occurrences: [] },
        { id: "EVID-008", kind: "evidence", label: "API key stored in secure secret storage", occurrences: [] },
      ],
      relations: [
        { from: "EVID-008", to: "REQ-712", kind: "supports", sourceBoxId: "requirements", sourcePath: "requirements[0]" },
      ],
    };
    expect(resolveSecurityDemoFocus(2, graph)).toEqual({ entityId: "REQ-712", view: "traceability" });
    expect(resolveSecurityDemoFocus(3, graph, "AST-209")).toEqual({ entityId: "REQ-712", view: "microsoft-security-lens" });
    expect(resolveSecurityDemoFocus(3, { entities: [graph.entities[0]], relations: [] }, "AST-209")).toEqual({
      entityId: "AST-209",
      view: "microsoft-security-lens",
    });
    expect(resolveSecurityDemoFocus(3, { entities: [graph.entities[0]], relations: [] })).toEqual({
      entityId: "AST-209",
      view: "microsoft-security-lens",
    });
  });
});
