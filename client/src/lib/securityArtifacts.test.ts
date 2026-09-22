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
  it("accepts array and mapping function_coverage, but rejects scalar values", () => {
    const upstream = { reqelicitor: { boxType: "reqelicitor" as const, output: requirementsPackage } };
    const validate = (coverage: string) => validateSecurityArtifact({
      boxType: "nistgap",
      output: nistPackage().replace("function_coverage: []", `function_coverage: ${coverage}`),
      upstreamArtifacts: upstream,
      trustedMetadata: { assessmentDate: "2026-09-22" },
    });

    expect(validate("[]").status).toBe("valid");
    expect(validate("{ GOVERN: { status: unknown }, IDENTIFY: { status: partial } }").status).toBe("valid");
    expect(validate("[{ function: GOVERN, status: unknown }, { function: IDENTIFY, status: partial }]").status).toBe("valid");
    for (const scalar of ["unknown", "123", "null"]) {
      const result = validate(scalar);
      expect(result.status).toBe("invalid");
      expect(result.issues.some((entry) => entry.path === "function_coverage" && entry.message === "function_coverage must be an array or object.")).toBe(true);
    }
  });

  it("continues requiring arrays for other NIST collections", () => {
    const upstream = { reqelicitor: { boxType: "reqelicitor" as const, output: requirementsPackage } };
    for (const field of ["exclusions", "findings", "unmapped_requirements", "unassessed_areas", "limitations"]) {
      const output = field === "findings"
        ? nistPackage().replace("findings:\n  - id: GAP-001\n    related_evidence: [EVID-001]", "findings: unknown")
        : nistPackage().replace(`${field}: []`, `${field}: unknown`);
      expect(validateSecurityArtifact({
        boxType: "nistgap",
        output,
        upstreamArtifacts: upstream,
        trustedMetadata: { assessmentDate: "2026-09-22" },
      }).status, field).toBe("invalid");
    }
  });

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
    const recommendation = `artifact_type: NextStepGuidance\nschema_version: "1.0"\nstatus: recommendation_ready\nguidance_id: NEXT-001\nrecommended_next_box: nist_csf_checker\nrecommended_next_step: Review requirements\nreason: Requirements are complete.\nhuman_review: [Review with the project team.]\nrelevant_upstream_references: [REQ-999]`;
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: recommendation, upstreamArtifacts: { nistgap: { boxType: "nistgap", output: nistPackage() } } }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: recommendation.replace("REQ-999", "REQ-001"), upstreamArtifacts: { nistgap: { boxType: "nistgap", output: nistPackage() } } }).status).toBe("valid");
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: recommendation.replace("NEXT-001", "NEXT-0") }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: recommendation.replace("nist_csf_checker", "asset_mapper") }).status).toBe("invalid");
  });

  it("resolves Advisor references from a direct RequirementsPackage", () => {
    const makeAdvisor = (reference: string) => `artifact_type: NextStepGuidance\nschema_version: "1.0"\nstatus: recommendation_ready\nguidance_id: NEXT-001\nrecommended_next_box: none\nrecommended_next_step: Review evidence\nreason: Direct requirements context.\nhuman_review: [Review with the project team.]\nrelevant_upstream_references: [${reference}]`;
    const upstreamArtifacts = { reqelicitor: { boxType: "reqelicitor" as const, output: requirementsPackage } };
    for (const reference of ["REQ-001", "AST-001", "EVID-001"]) {
      expect(validateSecurityArtifact({ boxType: "securityadvisor", output: makeAdvisor(reference), upstreamArtifacts }).status).toBe("valid");
    }
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: makeAdvisor("REQ-999"), upstreamArtifacts }).status).toBe("invalid");
  });

  it("resolves Advisor references from a direct AssetPackage", () => {
    const makeAdvisor = (reference: string) => `artifact_type: NextStepGuidance\nschema_version: "1.0"\nstatus: recommendation_ready\nguidance_id: NEXT-001\nrecommended_next_box: none\nrecommended_next_step: Review evidence\nreason: Direct asset context.\nhuman_review: [Review with the project team.]\nrelevant_upstream_references: [${reference}]`;
    const upstreamArtifacts = { assetmapper: { boxType: "assetmapper" as const, output: assetPackage } };
    for (const reference of ["AST-001", "EVID-001"]) {
      expect(validateSecurityArtifact({ boxType: "securityadvisor", output: makeAdvisor(reference), upstreamArtifacts }).status).toBe("valid");
    }
    for (const reference of ["AST-999", "EVID-999"]) {
      expect(validateSecurityArtifact({ boxType: "securityadvisor", output: makeAdvisor(reference), upstreamArtifacts }).status).toBe("invalid");
    }
  });

  it("keeps NIST GAP and nested RequirementsPackage references resolvable", () => {
    const advisor = `artifact_type: NextStepGuidance\nschema_version: "1.0"\nstatus: recommendation_ready\nguidance_id: NEXT-001\nrecommended_next_box: none\nrecommended_next_step: Review gaps\nreason: NIST context.\nhuman_review: [Review with the project team.]\nrelevant_upstream_references: [GAP-001, REQ-001, AST-001, EVID-001]`;
    const upstreamArtifacts = { nistgap: { boxType: "nistgap" as const, output: nistPackage() } };
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: advisor, upstreamArtifacts }).status).toBe("valid");
    for (const reference of ["GAP-999", "REQ-999", "AST-999", "EVID-999"]) {
      expect(validateSecurityArtifact({
        boxType: "securityadvisor",
        output: advisor.replace("GAP-001, REQ-001, AST-001, EVID-001", reference),
        upstreamArtifacts,
      }).status).toBe("invalid");
    }
  });

  it("accepts string, structured, and fallback interview questions but rejects unusable questions", () => {
    const base = `artifact_type: NextStepGuidance\nschema_version: "1.0"\nstatus: interview_required`;
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: `${base}\nfocused_questions: [What authentication method is used?]` }).status).toBe("clarification_required");
    expect(validateSecurityArtifact({
      boxType: "securityadvisor",
      output: `${base}\nfocused_questions:\n  - question: What authentication method is used?\n    why_it_matters: Determines the review path.\n    evidence_needed: Authentication architecture.`,
    }).status).toBe("clarification_required");
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: `${base}\nquestions: [What evidence is available?]` }).status).toBe("clarification_required");
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: `${base}\nfocused_questions: ["", "   "]\nquestions: []` }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: `${base}\nfocused_questions:\n  - why_it_matters: Needs context\n  - question: "   "` }).status).toBe("invalid");
  });

  it("warns when human review is missing or empty and accepts explicit review guidance", () => {
    const base = `artifact_type: NextStepGuidance\nschema_version: "1.0"\nstatus: recommendation_ready\nguidance_id: NEXT-001\nrecommended_next_box: none\nrecommended_next_step: Review evidence\nreason: Review the supplied evidence.`;
    for (const output of [base, `${base}\nhuman_review: []`]) {
      const result = validateSecurityArtifact({ boxType: "securityadvisor", output });
      expect(result.status).toBe("warning");
      expect(result.issues.some((entry) => entry.code === "missing_human_review_guidance" && entry.severity === "warning")).toBe(true);
    }
    expect(validateSecurityArtifact({
      boxType: "securityadvisor",
      output: `${base}\nhuman_review:\n  - Technical validation by project owner.`,
    }).status).toBe("valid");
  });

  it("validates optional recommendation lists and confidence shape without judging their content", () => {
    const base = `artifact_type: NextStepGuidance\nschema_version: "1.0"\nstatus: recommendation_ready\nguidance_id: NEXT-001\nrecommended_next_box: none\nrecommended_next_step: Review evidence\nreason: Review the supplied evidence.\nhuman_review: [Discuss with the owner.]`;
    expect(validateSecurityArtifact({
      boxType: "securityadvisor",
      output: `${base}\nassumptions: not-a-list`,
    }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: `${base}\nconfidence: 4` }).status).toBe("invalid");
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: `${base}\nconfidence: uncertain` }).status).toBe("valid");
    expect(validateSecurityArtifact({ boxType: "securityadvisor", output: `${base}\nconfidence:\n  level: unknown\n  rationale: Insufficient evidence.` }).status).toBe("valid");
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
