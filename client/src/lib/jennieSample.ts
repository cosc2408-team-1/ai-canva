import { stringify } from "yaml";
import type { SecurityArtifactBoxType } from "../types.js";

/**
 * Hand-authored fictional outputs for the Jennie sample board. They are examples,
 * not cached VAL responses or evidence that the proposed portal was tested.
 */
export function jennieSampleOutputs(assessmentDate: string): Record<SecurityArtifactBoxType, string> {
  const evidence = [
    { id: "EVID-001", source: "Project Description", statement: "Students will sign in with university Microsoft accounts and join assigned project groups.", verification_state: "unverified" },
    { id: "EVID-002", source: "Project Description", statement: "Students will upload PDF or DOCX reports that may contain names and assessment feedback.", verification_state: "unverified" },
    { id: "EVID-003", source: "Project Description", statement: "Tutors will review submissions for assigned groups and administrators will manage group membership.", verification_state: "unverified" },
    { id: "EVID-004", source: "Project Description", statement: "MFA and group-scoped access are proposed but have not been tested.", verification_state: "unverified" },
    { id: "EVID-005", source: "Project Description", statement: "No central log collection or assigned log reviewer has been described.", verification_state: "unverified" },
  ];
  const assets = [
    { id: "AST-001", name: "Uploaded student reports", asset_type: "data", description: "Reports may contain student names and assessment feedback.", owner: "course team", evidence_refs: ["EVID-002"] },
    { id: "AST-002", name: "Group membership records", asset_type: "data", description: "Membership records determine which students and tutors may view reports.", owner: "course administrators", evidence_refs: ["EVID-001", "EVID-003"] },
    { id: "AST-003", name: "University sign-in accounts", asset_type: "identity", description: "Student, tutor and administrator accounts are expected to use Microsoft Entra ID.", owner: "university", evidence_refs: ["EVID-001", "EVID-004"] },
  ];
  const boundary = { included: ["Proposed student project portal, identity and report access"], excluded: ["University identity infrastructure outside the proposed portal"] };
  const assetPackage = {
    artifact_type: "AssetPackage", schema_version: "1.0", case_id: "JENNIE-DEMO-001", status: "complete",
    assessment_boundary: boundary, assets, evidence_register: evidence, assumptions: [],
    open_questions: [], limitations: ["This inventory is based on the fictional project description. No deployment or configuration was inspected."],
  };
  const requirements = [
    { id: "REQ-001", shall_statement: "The portal SHALL allow report access only to the assigned group and its tutor.", acceptance_criteria: "A user from another group cannot read or download the report.", verification_method: "Access-control tests with accounts in different groups.", source_refs: ["EVID-002", "EVID-003"] },
    { id: "REQ-002", shall_statement: "The portal SHALL require MFA for student, tutor and administrator sign-in.", acceptance_criteria: "Each role is challenged for a second factor under the deployed policy.", verification_method: "Review the Entra ID policy and test each role.", source_refs: ["EVID-001", "EVID-004"] },
    { id: "REQ-003", shall_statement: "The portal SHALL record administrative changes to group membership.", acceptance_criteria: "A reviewer can identify the account, action and time of each change.", verification_method: "Inspect audit events and the review procedure.", source_refs: ["EVID-003", "EVID-005"] },
  ];
  const requirementsPackage = {
    artifact_type: "RequirementsPackage", schema_version: "1.0", case_id: "JENNIE-DEMO-001", status: "complete",
    assessment_boundary: boundary, assets, requirements, evidence_register: evidence, assumptions: [],
    open_questions: [], limitations: ["These are proposed requirements, not verified implemented controls."],
  };
  const nistPackage = {
    artifact_type: "NISTAssessmentPackage", schema_version: "1.0", report_id: "NIST-JENNIE-001",
    assessment_date: assessmentDate, status: "complete", framework_version: "NIST CSF 2.0",
    scope_boundary: ["Proposed portal sign-in, report access and monitoring"], exclusions: ["University identity infrastructure outside the portal"],
    requirements_package: requirementsPackage,
    function_coverage: [
      { csf_function: "PROTECT", status: "unknown", reason: "Proposed access controls have not been tested." },
      { csf_function: "DETECT", status: "unknown", reason: "Log review arrangements have not been confirmed." },
    ],
    findings: [
      { id: "GAP-001", gap_statement: "The proposed group access rules have not been tested.", gap_type: "evidence_gap", related_requirements: ["REQ-001"], related_assets: ["AST-001", "AST-002"], related_evidence: ["EVID-002", "EVID-003"], observed_state: "Draft rules are described.", target_state: "Tests show that only the assigned group and tutor can access a report.", missing_evidence: "Access-control test results.", confidence: "high" },
      { id: "GAP-002", gap_statement: "The proposed MFA policy has not been verified for all three roles.", gap_type: "evidence_gap", related_requirements: ["REQ-002"], related_assets: ["AST-003"], related_evidence: ["EVID-004"], observed_state: "MFA is planned.", target_state: "A deployed policy enforces MFA for students, tutors and administrators.", missing_evidence: "Policy configuration and role-based sign-in tests.", confidence: "high" },
      { id: "GAP-003", gap_statement: "No owner or process for reviewing security logs has been identified.", gap_type: "requirements_gap", related_requirements: ["REQ-003"], related_evidence: ["EVID-005"], observed_state: "Default Firebase logging is described, but no review owner is named.", target_state: "An assigned reviewer checks relevant events on an agreed schedule.", missing_evidence: "Monitoring procedure and ownership decision.", confidence: "medium" },
    ],
    unmapped_requirements: [], unassessed_areas: [],
    limitations: ["The assessment uses a fictional description and does not establish compliance or implementation status."],
  };
  const threatModel = {
    artifact_type: "ThreatModel", schema_version: "1.0", status: "complete",
    threats: [
      { id: "THR-001", asset_refs: ["AST-001", "AST-002"], threat: "A student views a report from another project group", stride_category: "Information Disclosure", attack_vector: "If group checks are too broad, a signed-in student could request another group's report.", attack_mapping: { technique_id: "T1078", technique_name: "Valid Accounts", tactic: "Initial Access", match: "closest", note: "A legitimate account could be used outside its assigned group." }, mitigations: ["Test Firestore and Storage rules with accounts from different groups."] },
      { id: "THR-002", asset_refs: ["AST-003"], threat: "An account is used without the intended MFA protection", stride_category: "Spoofing", attack_vector: "If the MFA policy is not enforced for a role, a stolen password could be enough to sign in.", attack_mapping: { technique_id: "T1078", technique_name: "Valid Accounts", tactic: "Initial Access", match: "closest", note: "The sign-in condition is hypothetical." }, mitigations: ["Verify the deployed MFA policy for each role."] },
      { id: "THR-003", asset_refs: ["AST-002"], threat: "An unauthorised membership change goes unnoticed", stride_category: "Repudiation", attack_vector: "If changes are not reviewed, a mistaken or malicious assignment may remain undetected.", attack_mapping: { technique_id: "unknown", match: "none" }, mitigations: ["Record and review changes to group membership."] },
    ],
    unmodelled_asset_refs: [], assumptions: [], open_questions: [],
    limitations: ["Threats are scenarios, not observed incidents. ATT&CK mappings require human review."],
  };
  const riskRegister = {
    artifact_type: "RiskRegister", schema_version: "1.0", status: "complete",
    scoring_model: "Illustrative 5 by 5 qualitative score using likelihood times impact.",
    risks: [
      { id: "RISK-001", threat_refs: ["THR-001"], asset_refs: ["AST-001", "AST-002"], scenario: "A student accesses another group's report.", likelihood: 4, impact: 4, risk_score: 16, risk_level: "High", likelihood_justification: "Group access rules are proposed but no tests were supplied.", impact_justification: "Reports may contain names and assessment feedback.", evidence_refs: ["EVID-002", "EVID-003"], assumption: "No access-control test results are available.", uncertainty: "High" },
      { id: "RISK-002", threat_refs: ["THR-002"], asset_refs: ["AST-003"], scenario: "A stolen password is used where MFA was not enforced.", likelihood: 3, impact: 4, risk_score: 12, risk_level: "Medium", likelihood_justification: "The MFA policy is planned but untested.", impact_justification: "A compromised account may reach assigned reports.", evidence_refs: ["EVID-001", "EVID-004"], assumption: "Policy coverage is unknown.", uncertainty: "High" },
      { id: "RISK-003", threat_refs: ["THR-003"], asset_refs: ["AST-002"], scenario: "An incorrect group assignment remains undetected.", likelihood: 2, impact: 3, risk_score: 6, risk_level: "Low", likelihood_justification: "No review process has been described.", impact_justification: "A wrong assignment may expose one group's work.", evidence_refs: ["EVID-003", "EVID-005"], assumption: "No monitoring owner has been assigned.", uncertainty: "High" },
    ],
    assumptions: [], open_questions: [],
    limitations: ["Scores are illustrative and must be reviewed against the deployed system and local risk criteria."],
  };
  const advisor = {
    artifact_type: "NextStepGuidance", schema_version: "1.0", status: "recommendation_ready",
    guidance_id: "NEXT-001", recommended_next_box: "none",
    recommended_next_step: "Test group access rules and MFA enforcement before the pilot, then assign a log-review owner.",
    reason: "The assessment has draft requirements but no configuration or test results for the main proposed controls.",
    inputs_to_prepare: ["Access-control tests for student and tutor roles.", "MFA policy configuration and role tests.", "A decision on who reviews security logs."],
    relevant_upstream_references: ["REQ-001", "REQ-002", "GAP-001", "GAP-002", "GAP-003"],
    human_review: ["The project team should confirm the proposed controls and review the test results before release."],
    assumptions: [], limitations: ["This is route guidance for a fictional sample, not an approval decision."],
    confidence: "moderate",
  };
  const irPlan = {
    artifact_type: "IncidentResponsePlan", schema_version: "1.0", status: "complete", mode: "readiness",
    selected_scenarios: [{ risk_refs: ["RISK-001"], threat_refs: ["THR-001"], scenario: "If group access fails, a student may read another group's report.", reason: "Highest illustrative risk in the register." }],
    known_facts: [{ statement: "Reports may contain student names and assessment feedback.", evidence_refs: ["EVID-002"] }],
    stated_requirements: ["Only the assigned group and tutor should be able to access a report."],
    phases: {
      preparation: { actions: ["Document access rules and escalation contacts."], assumptions: [], human_decisions: ["Who approves emergency access changes?"] },
      identification: { actions: ["Review report access records for cross-group reads."], assumptions: [], human_decisions: ["What evidence is sufficient to confirm exposure?"] },
      containment: { actions: ["Restrict affected report access while the issue is checked."], assumptions: [], human_decisions: ["Who decides whether affected students need notification?"] },
      eradication: { actions: ["Correct the access rule and test it against each role."], assumptions: [], human_decisions: [] },
      recovery: { actions: ["Restore access after the corrected rule passes tests."], assumptions: [], human_decisions: ["Who approves reopening access?"] },
      lessons_learned: { actions: ["Record what failed and add the case to future access tests."], assumptions: [], human_decisions: [] },
    },
    open_questions: [], limitations: ["This is a readiness exercise. No incident has been reported."],
    framework_note: "NIST SP 800-61 Rev. 2 was superseded by Rev. 3; check the current guidance before using this plan.",
  };
  const options = { lineWidth: 0 };
  return {
    assetmapper: stringify(assetPackage, options),
    reqelicitor: stringify(requirementsPackage, options),
    nistgap: stringify(nistPackage, options),
    securityadvisor: stringify(advisor, options),
    threatModeler: stringify(threatModel, options),
    riskScorer: stringify(riskRegister, options),
    irPlanner: stringify(irPlan, options),
  };
}
