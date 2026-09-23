import { describe, expect, it } from "vitest";
import { summarizeSecurityArtifact } from "./securityArtifactSummary.js";

const asset = `artifact_type: AssetPackage
schema_version: "1.0"
status: clarification_required
assets:
  - {id: AST-001, name: Student profiles}
  - {id: AST-002, name: Shared boards}
  - {id: AST-003, name: Documents}
  - {id: AST-004, name: User accounts}
evidence_register:
  - {id: EVID-001}
  - {id: EVID-002}
open_questions:
  - Who owns the system?
  - {question: Where are documents stored?}
  - How are sessions handled?
  - Who can access shared boards?
limitations: []`;

const requirements = `artifact_type: RequirementsPackage
schema_version: "1.0"
status: clarification_required
assets: [{id: AST-001, name: Student profiles}]
requirements:
  - {id: REQ-001, shall_statement: The system SHALL protect profiles.}
  - {id: REQ-002, shall_statement: The system SHALL limit access.}
evidence_register: [{id: EVID-001}]
open_questions:
  - {question: Who approves access?, why_it_matters: Determines ownership.}
  - Is MFA required?`;

const nist = `artifact_type: NISTAssessmentPackage
schema_version: "1.0"
status: clarification_required
framework_version: NIST CSF 2.0
findings:
  - {id: GAP-001, missing_evidence: Authentication test results}
  - {id: GAP-002}
unmapped_requirements: [REQ-002]
unassessed_areas:
  - {area: Recovery planning, reason: No exercise evidence}
  - {question: Is monitoring active?}`;

const advisorReady = `artifact_type: NextStepGuidance
schema_version: "1.0"
status: recommendation_ready
recommended_next_step: Review access controls with the project owner.
reason: Ownership evidence is missing.
inputs_to_prepare: [Access policy, User roles, Session design, Review notes]
human_review: [Project owner confirms roles., Security reviewer checks evidence.]
confidence: {level: medium}`;

const advisorInterview = `artifact_type: NextStepGuidance
schema_version: "1.0"
status: interview_required
focused_questions:
  - question: Who owns the access policy?
    why_it_matters: Determines the next reviewer.
  - Is the app deployed?`;

describe("security artifact presentation extraction", () => {
  it("summarizes AssetPackage counts and preserves question order", () => {
    const summary = summarizeSecurityArtifact("assetmapper", asset);
    expect(summary?.metrics).toEqual([
      { label: "Assets", count: 4 },
      { label: "Evidence items", count: 2 },
      { label: "Questions", count: 4 },
    ]);
    expect(summary?.examples).toEqual(["Student profiles", "Shared boards", "Documents", "User accounts"]);
    expect(summary?.clarificationItems.map((item) => item.text)).toEqual([
      "Who owns the system?", "Where are documents stored?", "How are sessions handled?", "Who can access shared boards?",
    ]);
  });

  it("summarizes RequirementsPackage without ranking or rewriting requirements", () => {
    const summary = summarizeSecurityArtifact("reqelicitor", requirements);
    expect(summary?.metrics).toEqual([
      { label: "Assets", count: 1 },
      { label: "Requirements", count: 2 },
      { label: "Evidence items", count: 1 },
      { label: "Questions", count: 2 },
    ]);
    expect(summary?.clarificationItems[0]).toEqual({ text: "Who approves access?", detail: "Determines ownership." });
    expect(summary?.title).toBe("Security requirements drafted");
  });

  it("summarizes NIST findings and evidence-limited areas without a compliance score", () => {
    const summary = summarizeSecurityArtifact("nistgap", nist);
    expect(summary?.frameworkVersion).toBe("NIST CSF 2.0");
    expect(summary?.metrics).toEqual([
      { label: "Findings", count: 2 },
      { label: "Unmapped requirements", count: 1 },
      { label: "Unassessed areas", count: 2 },
    ]);
    expect(summary?.clarificationItems.map((item) => item.text)).toEqual([
      "Recovery planning", "Is monitoring active?", "Authentication test results",
    ]);
    expect(JSON.stringify(summary)).not.toMatch(/percentage|score|compliant/i);
  });

  it("uses the Advisor's actual recommendation, reason, inputs and review guidance", () => {
    const summary = summarizeSecurityArtifact("securityadvisor", advisorReady);
    expect(summary?.recommendedNextStep).toBe("Review access controls with the project owner.");
    expect(summary?.reason).toBe("Ownership evidence is missing.");
    expect(summary?.inputsToPrepare).toHaveLength(4);
    expect(summary?.humanReview).toEqual(["Project owner confirms roles.", "Security reviewer checks evidence."]);
    expect(summary?.confidence).toBe("medium");
  });

  it("supports structured interview questions and the legacy questions field", () => {
    const summary = summarizeSecurityArtifact("securityadvisor", advisorInterview);
    expect(summary?.title).toBe("More context needed");
    expect(summary?.clarificationItems[0]).toEqual({ text: "Who owns the access policy?", detail: "Determines the next reviewer." });
    expect(summary?.clarificationItems[1].text).toBe("Is the app deployed?");
    expect(summarizeSecurityArtifact("securityadvisor", advisorInterview.replace("focused_questions:", "questions:"))?.clarificationItems).toEqual(summary?.clarificationItems);
  });

  it("returns unavailable for malformed, duplicate-key, wrong-type and unsupported YAML", () => {
    expect(summarizeSecurityArtifact("assetmapper", "assets: [")).toBeNull();
    expect(summarizeSecurityArtifact("assetmapper", asset + "\nassets: []")).toBeNull();
    expect(summarizeSecurityArtifact("reqelicitor", asset)).toBeNull();
    expect(summarizeSecurityArtifact("assetmapper", asset.replace('schema_version: "1.0"', 'schema_version: "2.0"'))).toBeNull();
    expect(summarizeSecurityArtifact("assetmapper", asset.replace("assets:", "asset_list:"))).toBeNull();
  });
});
