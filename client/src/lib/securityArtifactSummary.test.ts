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
  - {id: EVID-001, statement: Profiles are stored., source: Project brief}
  - {id: EVID-002, description: Boards are shared.}
  - {id: EVID-003, statement: Documents are uploaded.}
  - {id: EVID-004, statement: Users sign in.}
open_questions:
  - Who owns the system?
  - {question: Where are documents stored?, why_it_matters: Determines access.}
  - How are sessions handled?
  - Who can access shared boards?`;

const requirements = `artifact_type: RequirementsPackage
schema_version: "1.0"
status: clarification_required
assets:
  - {id: AST-001, name: Student profiles}
  - {id: AST-002, name: Shared boards}
  - {id: AST-003, name: Documents}
  - {id: AST-004, name: User accounts}
requirements:
  - {id: REQ-001, shall_statement: The system SHALL protect profiles., acceptance_criteria: Profiles are private.}
  - {id: REQ-002, shall_statement: The system SHALL limit access.}
  - {id: REQ-003, shall_statement: The system SHALL retain records.}
  - {id: REQ-004, shall_statement: The system SHALL log approvals.}
evidence_register:
  - {id: EVID-001, statement: Profiles are stored.}
  - {id: EVID-002, statement: Boards are shared.}
  - {id: EVID-003, statement: Documents are uploaded.}
  - {id: EVID-004, statement: Users sign in.}
open_questions:
  - Who approves access?
  - Is MFA required?
  - How long are records retained?
  - Are approvals audited?`;

const nist = `artifact_type: NISTAssessmentPackage
schema_version: "1.0"
status: clarification_required
framework_version: NIST CSF 2.0
findings:
  - {id: GAP-001, gap_statement: Authentication test results are missing., evidence_refs: [EVID-001]}
  - {id: GAP-002, observation: Recovery has not been evidenced.}
  - {id: GAP-003, finding: Monitoring ownership is unclear.}
  - {id: GAP-004, gap_statement: Access review evidence is missing.}
unmapped_requirements:
  - REQ-001
  - {requirement_id: REQ-002, statement: The system SHALL limit access.}
  - {id: REQ-003, shall_statement: The system SHALL retain records.}
  - {requirement_id: REQ-004}
unassessed_areas:
  - {area: Recovery planning, reason: No exercise evidence}
  - {question: Is monitoring active?, reason: No monitoring evidence}
  - Access ownership
  - {title: Incident response}
open_questions:
  - Is monitoring active?
  - Who owns recovery planning?
  - Is the provider independently reviewed?`;

const advisorReady = `artifact_type: NextStepGuidance
schema_version: "1.0"
status: recommendation_ready
guidance_id: NEXT-001
recommended_next_step: Review access controls with the project owner.
reason: Ownership evidence is missing.
inputs_to_prepare: [Access policy, User roles, Session design, Review notes]
human_review: [Project owner confirms roles., Security reviewer checks evidence., Team validates scope., Owner records decisions.]
confidence: {level: medium}`;

const advisorInterview = `artifact_type: NextStepGuidance
schema_version: "1.0"
status: interview_required
focused_questions:
  - question: Who owns the access policy?
    why_it_matters: Determines the next reviewer.
  - Is the app deployed?`;

describe("security artifact presentation extraction", () => {
  it("builds ordered Asset Mapper sections with IDs, wording, and empty states", () => {
    const summary = summarizeSecurityArtifact("assetmapper", asset)!;
    expect(summary.metrics).toEqual([
      { label: "Assets", count: 4 },
      { label: "Evidence items", count: 4 },
      { label: "Questions", count: 4 },
    ]);
    expect(summary.sections.map(({ key }) => key)).toEqual(["assets", "evidence", "questions"]);
    expect(summary.sections[0].items[0]).toEqual({ traceId: "AST-001", text: "Student profiles" });
    expect(summary.sections[1].items[0]).toEqual({ traceId: "EVID-001", text: "Profiles are stored.", detail: "Project brief" });
    expect(summary.sections[2].items[1]).toEqual({ text: "Where are documents stored?", detail: "Determines access." });

    const empty = summarizeSecurityArtifact("assetmapper", asset.replace(/^assets:[\s\S]*?evidence_register:/m, "assets: []\nevidence_register:").replace(/^evidence_register:[\s\S]*?open_questions:/m, "evidence_register: []\nopen_questions:").replace(/^open_questions:[\s\S]*$/m, "open_questions: []"))!;
    expect(empty.sections.map((entry) => [entry.heading, entry.items.length, entry.emptyText])).toEqual([
      ["Asset excerpts", 0, "No assets reported in this artifact."],
      ["Evidence excerpts", 0, "No evidence items reported in this artifact."],
      ["Open questions", 0, "No open questions reported in this artifact."],
    ]);
  });

  it("builds Requirements Elicitor asset, requirement, evidence, and question sections", () => {
    const summary = summarizeSecurityArtifact("reqelicitor", requirements)!;
    expect(summary.metrics).toEqual([
      { label: "Assets", count: 4 },
      { label: "Requirements", count: 4 },
      { label: "Evidence items", count: 4 },
      { label: "Questions", count: 4 },
    ]);
    expect(summary.sections.map(({ key }) => key)).toEqual(["assets", "requirements", "evidence", "questions"]);
    expect(summary.sections[0].items[0]).toEqual({ traceId: "AST-001", text: "Student profiles" });
    expect(summary.sections[1].items[0]).toEqual({ traceId: "REQ-001", text: "The system SHALL protect profiles.", detail: "Profiles are private." });
    expect(summary.sections[2].items[0]).toEqual({ traceId: "EVID-001", text: "Profiles are stored." });
  });

  it("provides empty sections for zero-count Requirements collections", () => {
    const output = `artifact_type: RequirementsPackage
schema_version: "1.0"
status: complete
assets: []
requirements: []
evidence_register: []
open_questions: []`;
    const summary = summarizeSecurityArtifact("reqelicitor", output)!;
    expect(summary.sections.map(({ items, emptyText }) => [items.length, emptyText])).toEqual([
      [0, "No assets reported in this artifact."],
      [0, "No requirements reported in this artifact."],
      [0, "No evidence items reported in this artifact."],
      [0, "No open questions reported in this artifact."],
    ]);
  });

  it("supports NIST mapping and string entries without duplicating unassessed questions", () => {
    const summary = summarizeSecurityArtifact("nistgap", nist)!;
    expect(summary.metrics).toEqual([
      { label: "Findings", count: 4 },
      { label: "Unmapped requirements", count: 4 },
      { label: "Unassessed areas", count: 4 },
    ]);
    expect(summary.sections.map(({ key }) => key)).toEqual(["findings", "unmapped", "unassessed", "questions"]);
    expect(summary.sections[0].items[0]).toEqual({ traceId: "GAP-001", text: "Authentication test results are missing.", detailTraceId: "EVID-001", detail: "EVID-001" });
    expect(summary.sections[1].items).toEqual([
      { traceId: "REQ-001", text: "" },
      { traceId: "REQ-002", text: "The system SHALL limit access." },
      { traceId: "REQ-003", text: "The system SHALL retain records." },
      { traceId: "REQ-004", text: "" },
    ]);
    expect(summary.sections[2].items.map(({ text }) => text)).toEqual([
      "Recovery planning", "Is monitoring active?", "Access ownership", "Incident response",
    ]);
    expect(summary.sections[3].items.map(({ text }) => text)).toEqual([
      "Who owns recovery planning?", "Is the provider independently reviewed?",
    ]);
    expect(JSON.stringify(summary)).not.toMatch(/priority ranking|compliance score|percentage/i);
  });

  it("shows empty states for zero-count NIST collections", () => {
    const output = nist
      .replace(/^findings:[\s\S]*?unmapped_requirements:/m, "findings: []\nunmapped_requirements:")
      .replace(/^unmapped_requirements:[\s\S]*?unassessed_areas:/m, "unmapped_requirements: []\nunassessed_areas:")
      .replace(/^unassessed_areas:[\s\S]*?open_questions:/m, "unassessed_areas: []\nopen_questions:")
      .replace(/^open_questions:[\s\S]*$/m, "open_questions: []");
    const summary = summarizeSecurityArtifact("nistgap", output)!;
    expect(summary.sections.slice(0, 3).map((entry) => [entry.items.length, entry.emptyText])).toEqual([
      [0, "No findings reported in this artifact."],
      [0, "No unmapped requirements reported in this artifact."],
      [0, "No unassessed areas reported in this artifact."],
    ]);
  });

  it("preserves Advisor guidance and supports the legacy questions field", () => {
    const summary = summarizeSecurityArtifact("securityadvisor", advisorReady)!;
    expect(summary.guidanceId).toBe("NEXT-001");
    expect(summary.recommendedNextStep).toBe("Review access controls with the project owner.");
    expect(summary.reason).toBe("Ownership evidence is missing.");
    expect(summary.confidence).toBe("medium");
    expect(summary.sections.map(({ key }) => key)).toEqual(["inputs", "human-review"]);
    expect(summary.sections[0].items).toHaveLength(4);
    expect(summary.sections[1].showAllLabel).toBe("Show all review items");

    const interview = summarizeSecurityArtifact("securityadvisor", advisorInterview)!;
    expect(interview.sections[0].heading).toBe("Open questions");
    expect(interview.sections[0].items[0]).toEqual({ text: "Who owns the access policy?", detail: "Determines the next reviewer." });
    expect(summarizeSecurityArtifact("securityadvisor", advisorInterview.replace("focused_questions:", "questions:"))?.sections).toEqual(interview.sections);
  });

  it("returns unavailable for malformed, duplicate-key, wrong-type and unsupported YAML", () => {
    expect(summarizeSecurityArtifact("assetmapper", "assets: [")).toBeNull();
    expect(summarizeSecurityArtifact("assetmapper", asset + "\nassets: []")).toBeNull();
    expect(summarizeSecurityArtifact("reqelicitor", asset)).toBeNull();
    expect(summarizeSecurityArtifact("assetmapper", asset.replace('schema_version: "1.0"', 'schema_version: "2.0"'))).toBeNull();
    expect(summarizeSecurityArtifact("assetmapper", asset.replace("assets:", "asset_list:"))).toBeNull();
  });
});
