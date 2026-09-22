import { describe, expect, it } from "vitest";
import {
  applicationAssessmentDate,
  nistTrustedMetadataPrompt,
  securityUpstreamGate,
  validateSecurityArtifact,
} from "./securityArtifacts.js";

const assetPackage = `artifact_type: AssetPackage
schema_version: "1.0"
case_id: CASE-001
status: complete
assessment_boundary:
  included: [Web application]
  excluded: []
assets:
  - id: AST-001
    name: Student profiles
    evidence_refs: [EVID-001]
evidence_register:
  - id: EVID-001
    source: Project Description
    statement: The platform stores user profiles.
assumptions: []
open_questions: []
limitations: [Limited to supplied evidence.]`;

const requirementsPackage = `artifact_type: RequirementsPackage
schema_version: "1.0"
case_id: CASE-001
status: complete
assessment_boundary:
  included: [Web application]
  excluded: []
assets:
  - id: AST-001
    name: Student profiles
    evidence_refs: [EVID-001]
requirements:
  - id: REQ-001
    shall_statement: The system shall protect profiles.
    source_refs: [EVID-001]
evidence_register:
  - id: EVID-001
    source: Project Description
    statement: The platform stores user profiles.
assumptions: []
open_questions: []
limitations: [Limited to supplied evidence.]`;

function nistPackage(requirements = requirementsPackage, date = "2026-09-22") {
  return `artifact_type: NISTAssessmentPackage
schema_version: "1.0"
report_id: NIST-TEST-001
assessment_date: ${date}
status: complete
framework_version: NIST CSF 2.0
scope_boundary: [Web application]
exclusions: []
requirements_package:
${requirements.split("\n").map((line) => `  ${line}`).join("\n")}
function_coverage: []
findings:
  - id: GAP-001
    related_evidence: [EVID-001]
unmapped_requirements: []
unassessed_areas: []
limitations: []`;
}

describe("security artifact YAML validation", () => {
  it("accepts a valid AssetPackage and clarification-required empty assets", () => {
    const valid = validateSecurityArtifact({ boxType: "assetmapper", output: assetPackage });
    expect(valid.parsed?.assets).toEqual([{ id: "AST-001", name: "Student profiles", evidence_refs: ["EVID-001"] }]);
    expect(valid.status).toBe("valid");
    expect(validateSecurityArtifact({
      boxType: "assetmapper",
      output: assetPackage.replace("status: complete", "status: clarification_required").replace(/assets:\n[\s\S]*?evidence_register:/, "assets: []\nevidence_register:"),
    }).status).toBe("clarification_required");
  });

  it("rejects malformed, fenced, scalar, and duplicate-key YAML", () => {
    expect(validateSecurityArtifact({ boxType: "assetmapper", output: "assets: [" }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "assetmapper", output: "```yaml\n" + assetPackage + "\n```" }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "assetmapper", output: "just text" }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "assetmapper", output: assetPackage + "\ncase_id: CASE-002" }).status).toBe("invalid");
  });

  it("requires the canonical artifact type, schema, and identity fields", () => {
    expect(validateSecurityArtifact({ boxType: "assetmapper", output: assetPackage.replace("AssetPackage", "RequirementsPackage") }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "assetmapper", output: assetPackage.replace('"1.0"', '"2.0"') }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "assetmapper", output: assetPackage.replace("case_id: CASE-001\n", "") }).status).toBe("invalid");
  });

  it("checks AssetPackage identifiers and evidence references without judging CIA values", () => {
    expect(validateSecurityArtifact({ boxType: "assetmapper", output: assetPackage.replace("AST-001", "AST-0") }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "assetmapper", output: assetPackage.replace("name: Student profiles", "name: Student profiles\n  - id: AST-001\n    name: Duplicate") }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "assetmapper", output: assetPackage.replace("source: Project Description", "source: Project Description\n  - id: EVID-001\n    source: Duplicate") }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "assetmapper", output: assetPackage.replace("evidence_refs: [EVID-001]", "evidence_refs: [EVID-009]") }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "assetmapper", output: assetPackage.replace("name: Student profiles", "name: Student profiles\n    cia: unknown") }).status).toBe("valid");
  });
});

describe("RequirementsPackage traceability", () => {
  it("preserves direct AssetPackage AST/EVID definitions while allowing additions", () => {
    const result = validateSecurityArtifact({
      boxType: "reqelicitor",
      output: requirementsPackage.replace("requirements:\n", "requirements:\n  - id: REQ-002\n    source_refs: [EVID-001]\n"),
      upstreamArtifacts: { assetmapper: { boxType: "assetmapper", output: assetPackage } },
    });
    expect(result.status).toBe("valid");
  });

  it("accepts clarification_required packages with preserved traceability", () => {
    expect(validateSecurityArtifact({
      boxType: "reqelicitor",
      output: requirementsPackage.replace("status: complete", "status: clarification_required"),
      upstreamArtifacts: { assetmapper: { boxType: "assetmapper", output: assetPackage } },
    }).status).toBe("clarification_required");
  });

  it("rejects duplicate requirements, broken evidence, missing assets, and rewritten upstream evidence", () => {
    const upstream = { assetmapper: { boxType: "assetmapper" as const, output: assetPackage } };
    expect(validateSecurityArtifact({ boxType: "reqelicitor", output: requirementsPackage.replace("REQ-001", "REQ-001\n  - id: REQ-001"), upstreamArtifacts: upstream }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "reqelicitor", output: requirementsPackage.replace("source_refs: [EVID-001]", "source_refs: [EVID-999]"), upstreamArtifacts: upstream }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "reqelicitor", output: requirementsPackage.replace(/assets:[\s\S]*?requirements:/, "assets: []\nrequirements:"), upstreamArtifacts: upstream }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "reqelicitor", output: requirementsPackage.replace("The platform stores user profiles.", "A different statement."), upstreamArtifacts: upstream }).status).toBe("invalid");
  });
});

describe("NISTAssessmentPackage trusted metadata", () => {
  it("uses injected UTC dates and rejects mismatches, wrong versions, and altered requirements", () => {
    expect(applicationAssessmentDate(new Date("2026-09-22T13:00:00Z"))).toBe("2026-09-22");
    expect(nistTrustedMetadataPrompt("2026-09-22")).toContain("assessment_date: 2026-09-22");
    const upstream = { reqelicitor: { boxType: "reqelicitor" as const, output: requirementsPackage } };
    expect(validateSecurityArtifact({ boxType: "nistgap", output: nistPackage(), upstreamArtifacts: upstream, trustedMetadata: { assessmentDate: "2026-09-22" } }).status).toBe("valid");
    expect(validateSecurityArtifact({ boxType: "nistgap", output: nistPackage(requirementsPackage, "2024-06-10"), upstreamArtifacts: upstream, trustedMetadata: { assessmentDate: "2026-09-22" } }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "nistgap", output: nistPackage().replace("NIST CSF 2.0", "ISO 27001"), upstreamArtifacts: upstream, trustedMetadata: { assessmentDate: "2026-09-22" } }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "nistgap", output: nistPackage(requirementsPackage.replace("REQ-001", "REQ-002")), upstreamArtifacts: upstream, trustedMetadata: { assessmentDate: "2026-09-22" } }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "nistgap", output: nistPackage().replace("related_evidence: [EVID-001]", "related_evidence: [EVID-999]"), upstreamArtifacts: upstream, trustedMetadata: { assessmentDate: "2026-09-22" } }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "nistgap", output: nistPackage().replace("id: GAP-001", "id: GAP-001\n  - id: GAP-001"), upstreamArtifacts: upstream, trustedMetadata: { assessmentDate: "2026-09-22" } }).status).toBe("invalid");
  });
});

describe("NextStepGuidance and execution gate", () => {
  it("maps a valid interview to clarification and validates recommendation references", () => {
    const interview = `artifact_type: NextStepGuidance\nschema_version: "1.0"\nstatus: interview_required\nfocused_questions: [What evidence is available?]`;
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: interview }).status).toBe("clarification_required");
    const recommendation = `artifact_type: NextStepGuidance\nschema_version: "1.0"\nstatus: recommendation_ready\nguidance_id: NEXT-001\nrecommended_next_box: nist_csf_checker\nrecommended_next_step: Review requirements\nreason: Requirements are complete.\nrelevant_upstream_references: [REQ-999]`;
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: recommendation, upstreamArtifacts: { nistgap: { boxType: "nistgap", output: nistPackage() } } }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: recommendation.replace("REQ-999", "REQ-001"), upstreamArtifacts: { nistgap: { boxType: "nistgap", output: nistPackage() } } }).status).toBe("valid");
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: recommendation.replace("NEXT-001", "NEXT-0") }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: recommendation.replace("nist_csf_checker", "asset_mapper") }).status).toBe("invalid");
  });

  it("blocks only invalid direct upstream artifacts and validates legacy output on demand", () => {
    const invalid = securityUpstreamGate("reqelicitor", [{ boxType: "assetmapper", title: "Asset Mapper", output: "not yaml" }]);
    expect(invalid.message).toContain("invalid structured artifact");
    const clarification = securityUpstreamGate("reqelicitor", [{ boxType: "assetmapper", title: "Asset Mapper", output: assetPackage.replace("status: complete", "status: clarification_required") }]);
    expect(clarification.message).toBeNull();
    const valid = securityUpstreamGate("reqelicitor", [{ boxType: "assetmapper", title: "Asset Mapper", output: assetPackage }]);
    expect(valid.message).toBeNull();
    const warning = securityUpstreamGate("securityadvisor", [{ boxType: "nistgap", title: "NIST CSF Gap Checker", output: nistPackage() }]);
    expect(warning.validations[0].validation.status).toBe("warning");
    expect(warning.message).toBeNull();
  });
});
