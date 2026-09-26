import { describe, expect, it } from "vitest";
import { securityUpstreamGate, validateSecurityArtifact } from "./securityArtifacts.js";
import { summarizeSecurityArtifact } from "./securityArtifactSummary.js";

// Fixtures follow the demo board: Asset Mapper → Threat Modeler → Risk Scorer
// → IR Planner, with the Asset Mapper also wired into the Risk Scorer.

const assetPackage = `artifact_type: AssetPackage
schema_version: "1.0"
case_id: CASE-001
status: complete
assessment_boundary:
  included: [Student project management web app]
  excluded: []
assets:
  - id: AST-001
    name: Shared project boards
    evidence_refs: [EVID-001]
  - id: AST-002
    name: Uploaded documents
    evidence_refs: [EVID-002]
evidence_register:
  - id: EVID-001
    source: Project Description
    statement: Only board owners and invited members should be able to access a shared board.
  - id: EVID-002
    source: Project Description
    statement: Uploaded documents are stored in Firebase Storage.
assumptions: []
open_questions: []
limitations: [Limited to supplied evidence.]`;

const threatModel = `artifact_type: ThreatModel
schema_version: "1.0"
status: complete
threats:
  - id: THR-001
    asset_refs: [AST-001]
    threat: Non-members read shared board content
    stride_category: Information Disclosure
    attack_vector: "If board access rules are not enforced, a signed-in non-member could open a board by its link."
    attack_mapping:
      technique_id: T1078
      technique_name: Valid Accounts
      tactic: Initial Access
      match: closest
      note: Uses a legitimate account to reach data it should not see.
    mitigations: [Enforce membership checks in Firestore security rules.]
  - id: THR-002
    asset_refs: [AST-002]
    threat: Uploaded documents downloaded by unauthorised users
    stride_category: Information Disclosure
    attack_vector: "If storage rules allow broad reads, an attacker could download documents directly."
    attack_mapping:
      technique_id: T1530
      technique_name: Data from Cloud Storage
      tactic: Collection
      match: exact
      note: ""
    mitigations: [Restrict Storage reads to board members.]
unmodelled_asset_refs: []
assumptions: []
open_questions: []
limitations: [ATT&CK mappings are AI-suggested and must be verified against attack.mitre.org before use.]`;

const riskRegister = `artifact_type: RiskRegister
schema_version: "1.0"
status: complete
scoring_model: Project-defined qualitative 5x5 model.
risks:
  - id: RISK-001
    threat_refs: [THR-001]
    asset_refs: [AST-001]
    scenario: Non-members read shared boards
    likelihood: 3
    impact: 4
    risk_score: 12
    risk_level: Medium
    likelihood_justification: The requirement is stated but enforcement is not evidenced.
    impact_justification: Board content includes student project work.
    evidence_refs: [EVID-001]
    assumption: "Assumption: access rules have not been reviewed."
    uncertainty: High
  - id: RISK-002
    threat_refs: [THR-002]
    asset_refs: [AST-002]
    scenario: Documents downloaded without permission
    likelihood: 2
    impact: 3
    risk_score: 6
    risk_level: Low
    likelihood_justification: Storage rules are not described.
    impact_justification: Documents may contain student project information.
    evidence_refs: [EVID-002]
    assumption: "Assumption: storage rules are unknown."
    uncertainty: High
assumptions: []
open_questions: []
limitations: []`;

function irPlan(overrides: { mode?: string; facts?: string; scenarios?: string; containmentDecisions?: string; note?: string } = {}) {
  return `artifact_type: IncidentResponsePlan
schema_version: "1.0"
status: complete
mode: ${overrides.mode ?? "readiness"}
selected_scenarios:${overrides.scenarios ?? `
  - risk_refs: [RISK-001]
    threat_refs: [THR-001]
    scenario: "If board access is not enforced, then non-members could read boards."
    reason: Highest risk score in the register.`}
known_facts:${overrides.facts ?? `
  - statement: Uploaded documents are stored in Firebase Storage.
    evidence_refs: [EVID-002]`}
stated_requirements:
  - Only board owners and invited members should be able to access a shared board.
phases:
  preparation: {actions: [Review Firestore and Storage rules.], assumptions: [], human_decisions: [Who approves rule changes.]}
  identification: {actions: [Watch for board reads by non-members.], assumptions: [], human_decisions: []}
  containment: {actions: [Revoke the shared link.], assumptions: [], human_decisions: ${overrides.containmentDecisions ?? "[Whether to notify affected students and the university.]"}}
  eradication: {actions: [Tighten access rules.], assumptions: [], human_decisions: []}
  recovery: {actions: [Restore normal access for members.], assumptions: [], human_decisions: []}
  lessons_learned: {actions: [Record cost and impact.], assumptions: [], human_decisions: []}
open_questions: []
limitations: []
framework_note: "${overrides.note ?? "Cross-referenced to NIST SP 800-61 Rev. 2, which was withdrawn when Rev. 3 was published in April 2025."}"`;
}

const codes = (result: ReturnType<typeof validateSecurityArtifact>) => result.issues.map((entry) => entry.code);

describe("ThreatModel", () => {
  it("accepts a valid model that references upstream assets", () => {
    const result = validateSecurityArtifact({
      boxType: "threatModeler",
      output: threatModel,
      upstreamArtifacts: { assetmapper: { boxType: "assetmapper", output: assetPackage } },
    });
    expect(result.status).toBe("valid");
  });

  it("rejects invented asset IDs and invalid STRIDE categories", () => {
    const output = threatModel
      .replace("asset_refs: [AST-002]", "asset_refs: [AST-099]")
      .replace("stride_category: Information Disclosure", "stride_category: Spoofing (+ Elevation of Privilege)");
    const result = validateSecurityArtifact({
      boxType: "threatModeler",
      output,
      upstreamArtifacts: { assetmapper: { boxType: "assetmapper", output: assetPackage } },
    });
    expect(result.status).toBe("invalid");
    expect(codes(result)).toEqual(expect.arrayContaining(["broken_reference", "invalid_stride_category"]));
  });

  it("warns on ATT&CK errors seen in testing without blocking the chain", () => {
    const output = threatModel
      .replace("tactic: Initial Access", "tactic: Credential Access")
      .replace("technique_id: T1530", "technique_id: T1195")
      .replace("technique_name: Data from Cloud Storage", "technique_name: Compromise Public Cloud Storage");
    const result = validateSecurityArtifact({ boxType: "threatModeler", output });
    expect(result.status).toBe("warning");
    expect(codes(result)).toEqual(expect.arrayContaining(["attack_tactic_mismatch", "attack_name_mismatch"]));
  });

  it("flags deprecated techniques and malformed IDs", () => {
    const deprecated = validateSecurityArtifact({ boxType: "threatModeler", output: threatModel.replace("T1530", "T1064") });
    expect(codes(deprecated)).toContain("deprecated_attack_technique");
    const malformed = validateSecurityArtifact({ boxType: "threatModeler", output: threatModel.replace("T1530", "Exfiltration") });
    expect(malformed.status).toBe("invalid");
    expect(codes(malformed)).toContain("malformed_attack_technique");
  });

  it("does not check a mapping the model marked as having no match", () => {
    const output = threatModel.replace("technique_id: T1530", "technique_id: unknown").replace("match: exact", "match: none");
    expect(validateSecurityArtifact({ boxType: "threatModeler", output }).status).toBe("valid");
  });
});

describe("RiskRegister", () => {
  const upstream = {
    threatModeler: { boxType: "threatModeler" as const, output: threatModel },
    assetmapper: { boxType: "assetmapper" as const, output: assetPackage },
  };

  it("accepts a valid, sorted register with evidence links", () => {
    expect(validateSecurityArtifact({ boxType: "riskScorer", output: riskRegister, upstreamArtifacts: upstream }).status).toBe("valid");
  });

  it("recomputes arithmetic and bands in code", () => {
    const wrongMaths = validateSecurityArtifact({ boxType: "riskScorer", output: riskRegister.replace("risk_score: 12", "risk_score: 15") });
    expect(codes(wrongMaths)).toContain("risk_arithmetic");
    // Risk 6 labelled Medium: the band error from testing.
    const wrongBand = validateSecurityArtifact({ boxType: "riskScorer", output: riskRegister.replace("risk_level: Low", "risk_level: Medium") });
    expect(wrongBand.status).toBe("invalid");
    expect(codes(wrongBand)).toContain("risk_level_band");
  });

  it("rejects references to threats and evidence that do not exist upstream", () => {
    const output = riskRegister.replace("threat_refs: [THR-002]", "threat_refs: [THR-013]").replace("evidence_refs: [EVID-002]", "evidence_refs: [EVID-009]");
    const result = validateSecurityArtifact({ boxType: "riskScorer", output, upstreamArtifacts: upstream });
    expect(result.issues.filter((entry) => entry.code === "broken_reference")).toHaveLength(2);
  });

  it("warns when likelihood 5 has no evidence and when scores do not differentiate", () => {
    const output = riskRegister
      .replace("likelihood: 3\n    impact: 4\n    risk_score: 12\n    risk_level: Medium", "likelihood: 5\n    impact: 4\n    risk_score: 20\n    risk_level: High")
      .replace("evidence_refs: [EVID-001]", "evidence_refs: []");
    expect(codes(validateSecurityArtifact({ boxType: "riskScorer", output }))).toContain("likelihood_without_evidence");

    const flat = riskRegister.replace("likelihood: 2\n    impact: 3\n    risk_score: 6\n    risk_level: Low", "likelihood: 3\n    impact: 4\n    risk_score: 12\n    risk_level: Medium");
    const three = flat.replace("assumptions: []\nopen_questions", `  - id: RISK-003
    threat_refs: [THR-001]
    scenario: Third risk
    likelihood: 3
    impact: 4
    risk_score: 12
    risk_level: Medium
    evidence_refs: []
    uncertainty: High
assumptions: []
open_questions`);
    expect(codes(validateSecurityArtifact({ boxType: "riskScorer", output: three }))).toContain("undifferentiated_scores");
  });

  it("warns when the register is not sorted highest first", () => {
    const swapped = riskRegister.replace("likelihood: 2\n    impact: 3\n    risk_score: 6\n    risk_level: Low", "likelihood: 4\n    impact: 4\n    risk_score: 16\n    risk_level: High");
    expect(codes(validateSecurityArtifact({ boxType: "riskScorer", output: swapped }))).toContain("register_not_sorted");
  });
});

describe("IncidentResponsePlan", () => {
  const upstream = {
    riskScorer: { boxType: "riskScorer" as const, output: riskRegister },
    assetmapper: { boxType: "assetmapper" as const, output: assetPackage },
  };

  it("accepts a readiness plan built from the register", () => {
    expect(validateSecurityArtifact({ boxType: "irPlanner", output: irPlan(), upstreamArtifacts: upstream }).status).toBe("valid");
  });

  it("rejects a scenario presented as a known fact", () => {
    const facts = `
  - statement: Firestore rules allow read access to all authenticated users (THR-001).
    evidence_refs: []`;
    const result = validateSecurityArtifact({ boxType: "irPlanner", output: irPlan({ facts }) });
    expect(result.status).toBe("invalid");
    expect(codes(result)).toContain("scenario_as_fact");
  });

  it("requires all six PICERL phases and named scenarios in readiness mode", () => {
    const missingPhase = irPlan().replace(/\n  eradication:.*$/m, "");
    expect(codes(validateSecurityArtifact({ boxType: "irPlanner", output: missingPhase }))).toContain("missing_phase");
    const noScenarios = validateSecurityArtifact({ boxType: "irPlanner", output: irPlan({ scenarios: " []" }) });
    expect(codes(noScenarios)).toContain("missing_selected_scenarios");
  });

  it("warns when an incident plan has no notification decision", () => {
    const output = irPlan({ mode: "incident_response", scenarios: " []", containmentDecisions: "[Whether to take the board offline.]" });
    const result = validateSecurityArtifact({ boxType: "irPlanner", output });
    expect(result.status).toBe("warning");
    expect(codes(result)).toContain("missing_notification_decision");
  });

  it("warns when the framework note does not flag the superseded revision", () => {
    expect(codes(validateSecurityArtifact({ boxType: "irPlanner", output: irPlan({ note: "Uses NIST SP 800-61." }) }))).toContain("framework_note");
  });

  it("rejects risk references that are not in the upstream register", () => {
    const scenarios = `
  - risk_refs: [RISK-009]
    threat_refs: [THR-001]
    scenario: Invented scenario
    reason: Test`;
    const result = validateSecurityArtifact({ boxType: "irPlanner", output: irPlan({ scenarios }), upstreamArtifacts: upstream });
    expect(codes(result)).toContain("broken_reference");
  });
});

describe("Team 2 chain integration", () => {
  it("blocks the next box when an upstream artifact is invalid, with a box-specific message", () => {
    const broken = riskRegister.replace("risk_level: Low", "risk_level: Medium");
    const gate = securityUpstreamGate("irPlanner", [{ boxType: "riskScorer", title: "Risk Scorer Box", output: broken }]);
    expect(gate.message).toBe("Risk Scorer Box produced an invalid structured artifact. Fix or rerun it before running IR Planner.");
  });

  it("builds summaries for each artifact", () => {
    const threats = summarizeSecurityArtifact("threatModeler", threatModel)!;
    expect(threats.title).toBe("Threats modelled");
    expect(threats.sections[0].items[0].text).toBe("THR-001 — Non-members read shared board content");
    expect(threats.sections[0].items[0].detail).toContain("AST-001 · Information Disclosure · ATT&CK T1078 (closest match)");

    const risks = summarizeSecurityArtifact("riskScorer", riskRegister)!;
    expect(risks.metrics).toEqual([{ label: "High", count: 0 }, { label: "Medium", count: 1 }, { label: "Low", count: 1 }]);
    expect(risks.sections[0].items[0]).toEqual({ text: "RISK-001 — Non-members read shared boards", detail: "THR-001 · Risk 12 Medium · L3 × I4 · Uncertainty High" });

    const plan = summarizeSecurityArtifact("irPlanner", irPlan())!;
    expect(plan.title).toBe("Readiness plan");
    expect(plan.sections.map((entry) => entry.key)).toEqual(["scenarios", "facts", "decisions", "questions"]);
    expect(plan.sections[2].items).toHaveLength(2);
  });

  it("leaves Spencer's four boxes' validation unchanged", () => {
    expect(validateSecurityArtifact({ boxType: "assetmapper", output: assetPackage }).status).toBe("valid");
  });
});
