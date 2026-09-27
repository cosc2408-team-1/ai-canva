import { parseDocument } from "yaml";
import type {
  SecurityArtifactBoxType,
  SecurityArtifactValidation,
  SecurityArtifactValidationIssue,
} from "../types.js";

type ArtifactRecord = Record<string, unknown>;

export interface SecurityArtifactInput {
  boxType: SecurityArtifactBoxType;
  output: string;
}

export interface SecurityArtifactUpstream extends SecurityArtifactInput {
  title: string;
  sourceId?: string;
  validation?: SecurityArtifactValidation;
}

export interface SecurityArtifactValidationContext {
  boxType: SecurityArtifactBoxType;
  output: string;
  upstreamArtifacts?: Partial<Record<SecurityArtifactBoxType, SecurityArtifactInput>>;
  trustedMetadata?: { assessmentDate?: string };
  now?: () => number;
}

export interface SecurityArtifactValidationResult extends SecurityArtifactValidation {
  /** Ephemeral parsed YAML for same-run checks only. Never store this in BoxData. */
  parsed?: ArtifactRecord;
}

const ID_PATTERNS: Record<string, RegExp> = {
  AST: /^AST-0*[1-9]\d*$/,
  EVID: /^EVID-0*[1-9]\d*$/,
  REQ: /^REQ-0*[1-9]\d*$/,
  GAP: /^GAP-0*[1-9]\d*$/,
  NEXT: /^NEXT-0*[1-9]\d*$/,
  THR: /^THR-0*[1-9]\d*$/,
  RISK: /^RISK-0*[1-9]\d*$/,
};

const REQUIRED: Record<SecurityArtifactBoxType, string[]> = {
  assetmapper: ["artifact_type", "schema_version", "case_id", "status", "assessment_boundary", "assets", "evidence_register", "assumptions", "open_questions", "limitations"],
  reqelicitor: ["artifact_type", "schema_version", "case_id", "status", "assessment_boundary", "assets", "requirements", "evidence_register", "assumptions", "open_questions", "limitations"],
  nistgap: ["artifact_type", "schema_version", "report_id", "assessment_date", "status", "framework_version", "scope_boundary", "exclusions", "requirements_package", "function_coverage", "findings", "unmapped_requirements", "unassessed_areas", "limitations"],
  securityadvisor: ["artifact_type", "schema_version", "status"],
  threatModeler: ["artifact_type", "schema_version", "status", "threats", "assumptions", "open_questions", "limitations"],
  riskScorer: ["artifact_type", "schema_version", "status", "scoring_model", "risks", "assumptions", "open_questions", "limitations"],
  irPlanner: ["artifact_type", "schema_version", "status", "mode", "selected_scenarios", "known_facts", "phases", "open_questions", "limitations", "framework_note"],
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
  "threat_refs",
  "risk_refs",
  "unmodelled_asset_refs",
  "source_refs",
  "evidence_refs",
  "asset_refs",
  "related_assets",
  "related_evidence",
  "relevant_upstream_references",
]);

export function applicationAssessmentDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Runtime-only prompt content, deliberately separate from static BoxType prompts. */
export function nistTrustedMetadataPrompt(assessmentDate: string): string {
  return `\n\nTrusted application metadata:\nassessment_date: ${assessmentDate}\n\nInstructions:\n- Copy this assessment_date exactly.\n- Do not infer, replace, reinterpret, or invent another assessment date.`;
}

function record(value: unknown): ArtifactRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as ArtifactRecord
    : null;
}

function plainRecord(value: unknown): ArtifactRecord | null {
  const item = record(value);
  if (!item) return null;
  const prototype = Object.getPrototypeOf(item);
  return prototype === Object.prototype || prototype === null ? item : null;
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function usableQuestions(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((entry) => {
    if (typeof entry === "string") return entry.trim().length > 0;
    return typeof record(entry)?.question === "string" && (record(entry)?.question as string).trim().length > 0;
  });
}

function identifier(value: unknown, keys: string[]): string | null {
  const item = record(value);
  if (!item) return null;
  for (const key of keys) if (typeof item[key] === "string") return item[key] as string;
  return null;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const item = record(value);
  if (item) return `{${Object.keys(item).sort().map((key) => `${JSON.stringify(key)}:${canonical(item[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function issue(
  issues: SecurityArtifactValidationIssue[],
  code: string,
  path: string,
  message: string,
  severity: "warning" | "error" = "error",
) {
  issues.push({ code, severity, path, message });
}

function requiredFields(value: ArtifactRecord, fields: string[], issues: SecurityArtifactValidationIssue[]) {
  for (const field of fields) {
    if (!(field in value) || value[field] === null || value[field] === "") {
      issue(issues, "missing_required_field", field, `Missing required field ${field}.`);
    }
  }
}

function validateDefinitionIds(
  entries: unknown,
  prefix: "AST" | "EVID" | "REQ" | "GAP" | "THR" | "RISK",
  path: string,
  keys: string[],
  issues: SecurityArtifactValidationIssue[],
): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(entries)) {
    issue(issues, "invalid_structure", path, `${path} must be an array.`);
    return ids;
  }
  entries.forEach((entry, index) => {
    const id = identifier(entry, keys);
    if (!id || !ID_PATTERNS[prefix].test(id)) {
      issue(issues, "malformed_identifier", `${path}[${index}]`, `${path} entries require a ${prefix}-* identifier.`);
      return;
    }
    if (ids.has(id)) issue(issues, "duplicate_identifier", `${path}[${index}]`, `Duplicate ${id}.`);
    ids.add(id);
  });
  return ids;
}

function validateReferenceFields(
  value: unknown,
  known: Record<string, Set<string>>,
  issues: SecurityArtifactValidationIssue[],
  path = "",
) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateReferenceFields(entry, known, issues, `${path}[${index}]`));
    return;
  }
  const item = record(value);
  if (!item) return;
  for (const [key, child] of Object.entries(item)) {
    const childPath = path ? `${path}.${key}` : key;
    if (REFERENCE_FIELDS.has(key)) {
      for (const ref of strings(child)) {
        const namespace = ref.split("-", 1)[0];
        const ids = known[namespace];
        if (ids && !ids.has(ref)) issue(issues, "broken_reference", childPath, `Broken reference ${ref}.`);
      }
    }
    validateReferenceFields(child, known, issues, childPath);
  }
}

function validateBoundary(value: unknown, field: string, issues: SecurityArtifactValidationIssue[]) {
  const boundary = record(value);
  if (!boundary || !Array.isArray(boundary.included) || !Array.isArray(boundary.excluded)) {
    issue(issues, "invalid_structure", field, `${field} must contain included and excluded arrays.`);
  }
}

function validateStatus(value: ArtifactRecord, allowed: string[], issues: SecurityArtifactValidationIssue[]) {
  if (typeof value.status !== "string" || !allowed.includes(value.status)) {
    issue(issues, "invalid_status", "status", `status must be one of: ${allowed.join(", ")}.`);
  }
}

function parseArtifact(output: string, issues: SecurityArtifactValidationIssue[]): ArtifactRecord | null {
  if (/^\s*```/.test(output)) issue(issues, "markdown_fence", "output", "Output must be YAML without Markdown fences.");
  try {
    const document = parseDocument(output, { uniqueKeys: true });
    if (document.errors.length) {
      document.errors.forEach((error) => issue(issues, "malformed_yaml", "output", error.message));
      return null;
    }
    const parsed = record(document.toJS({ maxAliasCount: 0 }));
    if (!parsed) issue(issues, "invalid_top_level", "output", "YAML top level must be an object.");
    return parsed;
  } catch (error) {
    issue(issues, "malformed_yaml", "output", error instanceof Error ? error.message : "YAML parsing failed.");
    return null;
  }
}

function validateAssetPackage(value: ArtifactRecord, issues: SecurityArtifactValidationIssue[]) {
  validateBoundary(value.assessment_boundary, "assessment_boundary", issues);
  for (const field of ["assets", "evidence_register", "assumptions", "open_questions", "limitations"]) {
    if (!Array.isArray(value[field])) issue(issues, "invalid_structure", field, `${field} must be an array.`);
  }
  const assets = validateDefinitionIds(value.assets, "AST", "assets", ["id", "asset_id"], issues);
  const evidence = validateDefinitionIds(value.evidence_register, "EVID", "evidence_register", ["id", "evidence_id"], issues);
  validateReferenceFields(value.assets, { EVID: evidence }, issues, "assets");
  return { assets, evidence };
}

function validateRequirementsPackage(value: ArtifactRecord, issues: SecurityArtifactValidationIssue[]) {
  validateBoundary(value.assessment_boundary, "assessment_boundary", issues);
  for (const field of ["assets", "requirements", "evidence_register", "assumptions", "open_questions", "limitations"]) {
    if (!Array.isArray(value[field])) issue(issues, "invalid_structure", field, `${field} must be an array.`);
  }
  const assets = validateDefinitionIds(value.assets, "AST", "assets", ["id", "asset_id"], issues);
  const evidence = validateDefinitionIds(value.evidence_register, "EVID", "evidence_register", ["id", "evidence_id"], issues);
  const requirements = validateDefinitionIds(value.requirements, "REQ", "requirements", ["id", "requirement_id"], issues);
  validateReferenceFields(value.requirements, { AST: assets, EVID: evidence, REQ: requirements }, issues, "requirements");
  return { assets, evidence, requirements };
}

function validateUpstreamAssetPreservation(
  upstream: ArtifactRecord,
  downstream: ArtifactRecord,
  issues: SecurityArtifactValidationIssue[],
) {
  const upstreamAssets = Array.isArray(upstream.assets) ? upstream.assets : [];
  const downstreamAssets = Array.isArray(downstream.assets) ? downstream.assets : [];
  const downstreamAssetIds = new Set(downstreamAssets.map((entry) => identifier(entry, ["id", "asset_id"])).filter(Boolean));
  upstreamAssets.forEach((entry) => {
    const id = identifier(entry, ["id", "asset_id"]);
    if (id && !downstreamAssetIds.has(id)) issue(issues, "upstream_traceability_lost", "assets", `Upstream asset ${id} is missing.`);
  });
  const upstreamEvidence = Array.isArray(upstream.evidence_register) ? upstream.evidence_register : [];
  const downstreamEvidence = new Map(
    (Array.isArray(downstream.evidence_register) ? downstream.evidence_register : [])
      .map((entry) => [identifier(entry, ["id", "evidence_id"]), entry] as const)
      .filter(([id]) => Boolean(id)),
  );
  upstreamEvidence.forEach((entry) => {
    const id = identifier(entry, ["id", "evidence_id"]);
    const retained = id ? downstreamEvidence.get(id) : undefined;
    if (id && !retained) issue(issues, "upstream_traceability_lost", "evidence_register", `Upstream evidence ${id} is missing.`);
    if (id && retained) {
      const source = record(entry)?.source;
      const statement = record(entry)?.statement;
      const next = record(retained);
      if ((source !== undefined && canonical(source) !== canonical(next?.source)) || (statement !== undefined && canonical(statement) !== canonical(next?.statement))) {
        issue(issues, "upstream_traceability_rewritten", "evidence_register", `Upstream evidence ${id} was materially rewritten.`);
      }
    }
  });
}

function parseUpstream(input: SecurityArtifactInput | undefined, issues: SecurityArtifactValidationIssue[]): ArtifactRecord | null {
  return input ? parseArtifact(input.output, issues) : null;
}

function validateNistPackage(
  value: ArtifactRecord,
  issues: SecurityArtifactValidationIssue[],
  upstream: Partial<Record<SecurityArtifactBoxType, SecurityArtifactInput>>,
  assessmentDate: string,
) {
  for (const field of ["scope_boundary", "exclusions", "findings", "unmapped_requirements", "unassessed_areas", "limitations"]) {
    if (!Array.isArray(value[field]) && !(field === "scope_boundary" && record(value[field]))) {
      issue(issues, "invalid_structure", field, `${field} must be a structured value.`);
    }
  }
  if (!Array.isArray(value.function_coverage) && !plainRecord(value.function_coverage)) {
    issue(issues, "invalid_structure", "function_coverage", "function_coverage must be an array or object.");
  }
  if (assessmentDate && value.assessment_date !== assessmentDate) {
    issue(issues, "trusted_metadata_mismatch", "assessment_date", "assessment_date does not match application-supplied metadata.");
  } else if (!assessmentDate && typeof value.assessment_date === "string") {
    issue(issues, "trusted_metadata_unavailable", "assessment_date", "Legacy output has no stored application-supplied assessment date.", "warning");
  }
  if (typeof value.framework_version !== "string" || !/nist.*csf.*2(?:\.0)?|csf.*2(?:\.0)?/i.test(value.framework_version)) {
    issue(issues, "wrong_framework_version", "framework_version", "framework_version must clearly identify NIST CSF 2.0.");
  }
  const nested = record(value.requirements_package);
  if (!nested) {
    issue(issues, "invalid_structure", "requirements_package", "requirements_package must be an object.");
    return;
  }
  const nestedIssues: SecurityArtifactValidationIssue[] = [];
  validateRequirementsPackage(nested, nestedIssues);
  issues.push(...nestedIssues);
  const ids = validateRequirementsPackage(nested, []);
  const gaps = validateDefinitionIds(value.findings, "GAP", "findings", ["id", "gap_id"], issues);
  validateReferenceFields(value.findings, { AST: ids.assets, EVID: ids.evidence, REQ: ids.requirements, GAP: gaps }, issues, "findings");
  const upstreamRequirements = parseUpstream(upstream.reqelicitor, issues);
  if (upstreamRequirements && canonical(upstreamRequirements) !== canonical(nested)) {
    issue(issues, "upstream_traceability_rewritten", "requirements_package", "requirements_package does not preserve the upstream RequirementsPackage.");
  }
}

function validateAdvisor(value: ArtifactRecord, issues: SecurityArtifactValidationIssue[], upstream: Partial<Record<SecurityArtifactBoxType, SecurityArtifactInput>>) {
  const status = value.status;
  if (status === "interview_required") {
    if (!usableQuestions(value.focused_questions) && !usableQuestions(value.questions)) {
      issue(issues, "missing_required_field", "focused_questions", "interview_required needs at least one usable question.");
    }
  }
  if (status === "recommendation_ready") {
    const guidance = typeof value.guidance_id === "string" ? value.guidance_id : "";
    if (!ID_PATTERNS.NEXT.test(guidance)) issue(issues, "malformed_identifier", "guidance_id", "guidance_id must be a NEXT-* identifier.");
    const allowed = ["security_requirements_elicitor", "nist_csf_checker", "security_advisor", "none"];
    if (typeof value.recommended_next_box !== "string" || !allowed.includes(value.recommended_next_box)) issue(issues, "invalid_next_box", "recommended_next_box", "recommended_next_box is not allowed.");
    for (const field of ["recommended_next_step", "reason"]) if (typeof value[field] !== "string" || !value[field]) issue(issues, "missing_required_field", field, `Missing required field ${field}.`);
    if (value.human_review === undefined || (Array.isArray(value.human_review) && value.human_review.length === 0)) {
      issue(issues, "missing_human_review_guidance", "human_review", "Recommendation should identify applicable human review or decision boundaries.", "warning");
    }
    for (const field of ["inputs_to_prepare", "human_review", "assumptions", "limitations"]) {
      if (value[field] !== undefined && !Array.isArray(value[field])) {
        issue(issues, "invalid_structure", field, `${field} must be a list when supplied.`);
      }
    }
    if (value.confidence !== undefined) {
      const confidence = record(value.confidence);
      if (!(typeof value.confidence === "string" && value.confidence.trim()) && !confidence) {
        issue(issues, "invalid_structure", "confidence", "confidence must be a non-empty string or structured object when supplied.");
      }
    }
  }
  const known: Record<string, Set<string>> = {};
  const addIds = (namespace: string, ids: Set<string>) => {
    known[namespace] ??= new Set<string>();
    ids.forEach((id) => known[namespace].add(id));
  };
  const assetMapper = parseUpstream(upstream.assetmapper, issues);
  if (assetMapper) {
    const ids = validateAssetPackage(assetMapper, []);
    addIds("AST", ids.assets);
    addIds("EVID", ids.evidence);
  }
  const requirements = parseUpstream(upstream.reqelicitor, issues);
  if (requirements) {
    const ids = validateRequirementsPackage(requirements, []);
    addIds("AST", ids.assets);
    addIds("EVID", ids.evidence);
    addIds("REQ", ids.requirements);
  }
  const nist = parseUpstream(upstream.nistgap, issues);
  if (nist) {
    const nested = record(nist.requirements_package);
    if (nested) {
      const ids = validateRequirementsPackage(nested, []);
      addIds("AST", ids.assets);
      addIds("EVID", ids.evidence);
      addIds("REQ", ids.requirements);
    }
    addIds("GAP", validateDefinitionIds(nist.findings, "GAP", "findings", ["id", "gap_id"], []));
  }
  validateReferenceFields(value, known, issues);
}

// ---------------------------------------------------------------------------
// Team 2 artifacts: ThreatModel -> RiskRegister -> IncidentResponsePlan.
// These checks run in code so the app, not the model, has the final say on
// structure, arithmetic and traceability. Semantic checks the model tends to
// get wrong (ATT&CK mappings, scenarios presented as facts) are flagged too.
// ---------------------------------------------------------------------------

const STRIDE_CATEGORIES = [
  "Spoofing",
  "Tampering",
  "Repudiation",
  "Information Disclosure",
  "Denial of Service",
  "Elevation of Privilege",
];

const ATTACK_TECHNIQUE_ID = /^T\d{4}(\.\d{3})?$/;

/** Enterprise techniques retired in ATT&CK's 2020 sub-technique migration. */
export const DEPRECATED_ATTACK_TECHNIQUES = new Set([
  "T1043", "T1064", "T1085", "T1086", "T1088", "T1089", "T1093",
  "T1100", "T1107", "T1170", "T1192", "T1193", "T1194",
]);

/**
 * Reference data for techniques commonly suggested for web and cloud apps.
 * Only listed techniques get name/tactic checks; anything else still needs a
 * human to verify it against attack.mitre.org.
 */
export const KNOWN_ATTACK_TECHNIQUES: Record<string, { name: string; tactics: string[] }> = {
  T1040: { name: "Network Sniffing", tactics: ["Credential Access", "Discovery"] },
  T1041: { name: "Exfiltration Over C2 Channel", tactics: ["Exfiltration"] },
  T1059: { name: "Command and Scripting Interpreter", tactics: ["Execution"] },
  T1078: { name: "Valid Accounts", tactics: ["Defense Evasion", "Persistence", "Privilege Escalation", "Initial Access"] },
  T1098: { name: "Account Manipulation", tactics: ["Persistence", "Privilege Escalation"] },
  T1110: { name: "Brute Force", tactics: ["Credential Access"] },
  "T1110.004": { name: "Credential Stuffing", tactics: ["Credential Access"] },
  T1133: { name: "External Remote Services", tactics: ["Persistence", "Initial Access"] },
  T1136: { name: "Create Account", tactics: ["Persistence"] },
  T1189: { name: "Drive-by Compromise", tactics: ["Initial Access"] },
  T1190: { name: "Exploit Public-Facing Application", tactics: ["Initial Access"] },
  T1195: { name: "Supply Chain Compromise", tactics: ["Initial Access"] },
  T1213: { name: "Data from Information Repositories", tactics: ["Collection"] },
  T1485: { name: "Data Destruction", tactics: ["Impact"] },
  T1496: { name: "Resource Hijacking", tactics: ["Impact"] },
  T1498: { name: "Network Denial of Service", tactics: ["Impact"] },
  T1499: { name: "Endpoint Denial of Service", tactics: ["Impact"] },
  T1530: { name: "Data from Cloud Storage", tactics: ["Collection"] },
  "T1550.001": { name: "Application Access Token", tactics: ["Defense Evasion", "Lateral Movement"] },
  T1552: { name: "Unsecured Credentials", tactics: ["Credential Access"] },
  T1557: { name: "Adversary-in-the-Middle", tactics: ["Credential Access", "Collection"] },
  T1565: { name: "Data Manipulation", tactics: ["Impact"] },
  T1566: { name: "Phishing", tactics: ["Initial Access"] },
  "T1566.002": { name: "Spearphishing Link", tactics: ["Initial Access"] },
  T1567: { name: "Exfiltration Over Web Service", tactics: ["Exfiltration"] },
  "T1567.001": { name: "Exfiltration to Code Repository", tactics: ["Exfiltration"] },
  "T1567.002": { name: "Exfiltration to Cloud Storage", tactics: ["Exfiltration"] },
};

const IR_PHASES = ["preparation", "identification", "containment", "eradication", "recovery", "lessons_learned"];

function normalized(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() : "";
}

function nonEmptyText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Collects IDs defined by directly connected upstream artifacts, by namespace. */
function knownUpstreamIds(
  upstream: Partial<Record<SecurityArtifactBoxType, SecurityArtifactInput>>,
  issues: SecurityArtifactValidationIssue[],
): Record<string, Set<string>> {
  const known: Record<string, Set<string>> = {};
  const add = (namespace: string, ids: Set<string>) => {
    known[namespace] ??= new Set<string>();
    ids.forEach((id) => known[namespace].add(id));
  };
  const assetMapper = parseUpstream(upstream.assetmapper, issues);
  if (assetMapper) {
    const ids = validateAssetPackage(assetMapper, []);
    add("AST", ids.assets);
    add("EVID", ids.evidence);
  }
  const requirements = parseUpstream(upstream.reqelicitor, issues);
  if (requirements) {
    const ids = validateRequirementsPackage(requirements, []);
    add("AST", ids.assets);
    add("EVID", ids.evidence);
    add("REQ", ids.requirements);
  }
  const threatModel = parseUpstream(upstream.threatModeler, issues);
  if (threatModel) add("THR", validateDefinitionIds(threatModel.threats, "THR", "threats", ["id", "threat_id"], []));
  const riskRegister = parseUpstream(upstream.riskScorer, issues);
  if (riskRegister) add("RISK", validateDefinitionIds(riskRegister.risks, "RISK", "risks", ["id", "risk_id"], []));
  return known;
}

function validateAttackMapping(value: unknown, path: string, issues: SecurityArtifactValidationIssue[]) {
  const mapping = record(value);
  if (!mapping) {
    issue(issues, "missing_required_field", path, `Missing ${path}.`);
    return;
  }
  const match = mapping.match;
  if (!["exact", "closest", "none"].includes(String(match))) {
    issue(issues, "invalid_attack_match", `${path}.match`, "attack_mapping.match must be exact, closest or none.", "warning");
  }
  const id = typeof mapping.technique_id === "string" ? mapping.technique_id.trim() : "";
  if (!id || id.toLowerCase() === "unknown" || match === "none") return;
  if (!ATTACK_TECHNIQUE_ID.test(id)) {
    issue(issues, "malformed_attack_technique", `${path}.technique_id`, `${id} is not a MITRE ATT&CK technique ID (e.g. T1530 or T1566.002).`);
    return;
  }
  if (DEPRECATED_ATTACK_TECHNIQUES.has(id)) {
    issue(issues, "deprecated_attack_technique", `${path}.technique_id`, `${id} is a deprecated or revoked ATT&CK technique.`, "warning");
    return;
  }
  const known = KNOWN_ATTACK_TECHNIQUES[id];
  if (!known) return;
  if (nonEmptyText(mapping.technique_name) && normalized(mapping.technique_name) !== normalized(known.name)) {
    issue(issues, "attack_name_mismatch", `${path}.technique_name`, `${id} is "${known.name}", not "${mapping.technique_name}".`, "warning");
  }
  if (nonEmptyText(mapping.tactic) && !known.tactics.some((tactic) => normalized(tactic) === normalized(mapping.tactic))) {
    issue(issues, "attack_tactic_mismatch", `${path}.tactic`, `${id} belongs to ${known.tactics.join(", ")}, not ${mapping.tactic}.`, "warning");
  }
}

function validateThreatModel(
  value: ArtifactRecord,
  issues: SecurityArtifactValidationIssue[],
  upstream: Partial<Record<SecurityArtifactBoxType, SecurityArtifactInput>>,
) {
  for (const field of ["threats", "assumptions", "open_questions", "limitations"]) {
    if (!Array.isArray(value[field])) issue(issues, "invalid_structure", field, `${field} must be an array.`);
  }
  validateDefinitionIds(value.threats, "THR", "threats", ["id", "threat_id"], issues);
  const threats = Array.isArray(value.threats) ? value.threats : [];
  if (threats.length > 10) issue(issues, "too_many_threats", "threats", `${threats.length} threats modelled; the limit is 10.`, "warning");
  threats.forEach((entry, index) => {
    const threat = record(entry);
    const path = `threats[${index}]`;
    if (!threat) return;
    if (!nonEmptyText(threat.threat)) issue(issues, "missing_required_field", `${path}.threat`, "Each threat needs a description.");
    if (!STRIDE_CATEGORIES.includes(String(threat.stride_category))) {
      issue(issues, "invalid_stride_category", `${path}.stride_category`, `stride_category must be exactly one of: ${STRIDE_CATEGORIES.join(", ")}.`);
    }
    if (!nonEmptyText(threat.attack_vector)) issue(issues, "missing_required_field", `${path}.attack_vector`, "Each threat needs an attack vector.");
    if (!Array.isArray(threat.mitigations) || !threat.mitigations.some(nonEmptyText)) {
      issue(issues, "missing_required_field", `${path}.mitigations`, "Each threat needs at least one recommended mitigation.");
    }
    if (upstream.assetmapper && (!Array.isArray(threat.asset_refs) || threat.asset_refs.length === 0)) {
      issue(issues, "missing_asset_refs", `${path}.asset_refs`, "Threat does not reference any upstream asset.", "warning");
    }
    validateAttackMapping(threat.attack_mapping, `${path}.attack_mapping`, issues);
  });
  validateReferenceFields(value, knownUpstreamIds(upstream, issues), issues);
}

function validateRiskRegister(
  value: ArtifactRecord,
  issues: SecurityArtifactValidationIssue[],
  upstream: Partial<Record<SecurityArtifactBoxType, SecurityArtifactInput>>,
) {
  for (const field of ["risks", "assumptions", "open_questions", "limitations"]) {
    if (!Array.isArray(value[field])) issue(issues, "invalid_structure", field, `${field} must be an array.`);
  }
  validateDefinitionIds(value.risks, "RISK", "risks", ["id", "risk_id"], issues);
  const risks = Array.isArray(value.risks) ? value.risks : [];
  const scores: number[] = [];
  risks.forEach((entry, index) => {
    const risk = record(entry);
    const path = `risks[${index}]`;
    if (!risk) return;
    const likelihood = risk.likelihood;
    const impact = risk.impact;
    const validScale = (n: unknown) => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5;
    if (!validScale(likelihood)) issue(issues, "invalid_score", `${path}.likelihood`, "likelihood must be an integer from 1 to 5.");
    if (!validScale(impact)) issue(issues, "invalid_score", `${path}.impact`, "impact must be an integer from 1 to 5.");
    if (validScale(likelihood) && validScale(impact)) {
      const expected = (likelihood as number) * (impact as number);
      scores.push(expected);
      if (risk.risk_score !== expected) {
        issue(issues, "risk_arithmetic", `${path}.risk_score`, `risk_score should be ${likelihood} × ${impact} = ${expected}, not ${String(risk.risk_score)}.`);
      }
      const band = expected <= 6 ? "Low" : expected <= 14 ? "Medium" : "High";
      if (risk.risk_level !== band) {
        issue(issues, "risk_level_band", `${path}.risk_level`, `A score of ${expected} is ${band} (Low 1–6, Medium 7–14, High 15–25), not ${String(risk.risk_level)}.`);
      }
    }
    if (!["Low", "Medium", "High"].includes(String(risk.uncertainty))) {
      issue(issues, "invalid_uncertainty", `${path}.uncertainty`, "uncertainty must be Low, Medium or High.");
    }
    const evidence = Array.isArray(risk.evidence_refs) ? risk.evidence_refs : [];
    if (likelihood === 5 && evidence.length === 0) {
      issue(issues, "likelihood_without_evidence", `${path}.likelihood`, "Likelihood 5 is reserved for weaknesses the evidence confirms; no evidence_refs are cited.", "warning");
    }
    if (evidence.length === 0 && risk.uncertainty === "Low") {
      issue(issues, "unsupported_low_uncertainty", `${path}.uncertainty`, "Uncertainty is Low but no evidence_refs support the score.", "warning");
    }
    if (upstream.threatModeler && (!Array.isArray(risk.threat_refs) || risk.threat_refs.length === 0)) {
      issue(issues, "missing_threat_refs", `${path}.threat_refs`, "Risk does not reference an upstream threat.", "warning");
    }
  });
  for (let index = 1; index < scores.length; index += 1) {
    if (scores[index] > scores[index - 1]) {
      issue(issues, "register_not_sorted", "risks", "Risks are not sorted from highest to lowest risk_score.", "warning");
      break;
    }
  }
  if (scores.length >= 3 && scores.every((score) => score === scores[0])) {
    issue(issues, "undifferentiated_scores", "risks", `Every risk scored ${scores[0]}; scores should differentiate between threats.`, "warning");
  }
  validateReferenceFields(value, knownUpstreamIds(upstream, issues), issues);
}

function validateIncidentResponsePlan(
  value: ArtifactRecord,
  issues: SecurityArtifactValidationIssue[],
  upstream: Partial<Record<SecurityArtifactBoxType, SecurityArtifactInput>>,
) {
  const mode = value.mode;
  if (mode !== "incident_response" && mode !== "readiness") {
    issue(issues, "invalid_mode", "mode", "mode must be incident_response or readiness.");
  }
  for (const field of ["selected_scenarios", "known_facts", "open_questions", "limitations"]) {
    if (!Array.isArray(value[field])) issue(issues, "invalid_structure", field, `${field} must be an array.`);
  }
  if (mode === "readiness" && (!Array.isArray(value.selected_scenarios) || value.selected_scenarios.length === 0)) {
    issue(issues, "missing_selected_scenarios", "selected_scenarios", "Readiness plans must name the scenarios they prepare for.");
  }

  // Facts come from the project or incident description only.
  (Array.isArray(value.known_facts) ? value.known_facts : []).forEach((entry, index) => {
    const fact = record(entry);
    const statement = fact ? fact.statement : entry;
    const path = `known_facts[${index}]`;
    const refs = fact ? [...strings(fact.threat_refs), ...strings(fact.risk_refs)] : [];
    if (refs.length || (typeof statement === "string" && /\b(THR|RISK)-\d+/.test(statement))) {
      issue(issues, "scenario_as_fact", path, "A threat or risk scenario is listed as a known fact; move it to selected_scenarios.");
    }
  });

  const phases = record(value.phases);
  const decisions: string[] = [];
  if (!phases) {
    issue(issues, "invalid_structure", "phases", "phases must contain the six PICERL phases.");
  } else {
    const present = Object.keys(phases);
    for (const phase of IR_PHASES) {
      if (!(phase in phases)) {
        issue(issues, "missing_phase", `phases.${phase}`, `Missing the ${phase.replace("_", " ")} phase.`);
        continue;
      }
      const body = record(phases[phase]);
      if (!body || !Array.isArray(body.actions)) {
        issue(issues, "invalid_structure", `phases.${phase}.actions`, `${phase} needs an actions array.`);
      }
      if (body && Array.isArray(body.human_decisions)) decisions.push(...strings(body.human_decisions));
    }
    const order = present.filter((phase) => IR_PHASES.includes(phase));
    if (order.join(",") !== IR_PHASES.filter((phase) => order.includes(phase)).join(",")) {
      issue(issues, "phase_order", "phases", "Phases must follow PICERL order.", "warning");
    }
  }
  if (!decisions.some(nonEmptyText)) {
    issue(issues, "missing_human_decisions", "phases", "No human decisions are recorded in any phase.", "warning");
  }
  if (mode === "incident_response" && !decisions.some((decision) => /notif/i.test(decision))) {
    issue(issues, "missing_notification_decision", "phases", "No decision about notifying affected people is recorded.", "warning");
  }
  if (!nonEmptyText(value.framework_note) || !/rev\.?\s*2/i.test(String(value.framework_note))) {
    issue(issues, "framework_note", "framework_note", "framework_note should state that NIST SP 800-61 Rev. 2 has been superseded.", "warning");
  }
  validateReferenceFields(value, knownUpstreamIds(upstream, issues), issues);
}

export function validateSecurityArtifact(context: SecurityArtifactValidationContext): SecurityArtifactValidationResult {
  const issues: SecurityArtifactValidationIssue[] = [];
  const parsed = parseArtifact(context.output, issues);
  const assessmentDate = context.trustedMetadata?.assessmentDate || "";
  const now = context.now?.() ?? Date.now();
  if (!parsed) return finalize(context.boxType, "", "", "", issues, assessmentDate, now);

  requiredFields(parsed, REQUIRED[context.boxType], issues);
  const expectedType = ARTIFACT_TYPES[context.boxType];
  if (parsed.artifact_type !== expectedType) issue(issues, "wrong_artifact_type", "artifact_type", `artifact_type must be ${expectedType}.`);
  if (parsed.schema_version !== "1.0") issue(issues, "wrong_schema_version", "schema_version", "schema_version must be 1.0.");

  if (context.boxType === "assetmapper") {
    validateStatus(parsed, ["complete", "clarification_required"], issues);
    validateAssetPackage(parsed, issues);
  } else if (context.boxType === "reqelicitor") {
    validateStatus(parsed, ["complete", "clarification_required"], issues);
    validateRequirementsPackage(parsed, issues);
    const upstreamAsset = parseUpstream(context.upstreamArtifacts?.assetmapper, issues);
    if (upstreamAsset) validateUpstreamAssetPreservation(upstreamAsset, parsed, issues);
  } else if (context.boxType === "nistgap") {
    validateStatus(parsed, ["complete", "clarification_required"], issues);
    validateNistPackage(parsed, issues, context.upstreamArtifacts || {}, assessmentDate);
  } else if (context.boxType === "threatModeler") {
    validateStatus(parsed, ["complete", "clarification_required"], issues);
    validateThreatModel(parsed, issues, context.upstreamArtifacts || {});
  } else if (context.boxType === "riskScorer") {
    validateStatus(parsed, ["complete", "clarification_required"], issues);
    validateRiskRegister(parsed, issues, context.upstreamArtifacts || {});
  } else if (context.boxType === "irPlanner") {
    validateStatus(parsed, ["complete", "clarification_required"], issues);
    validateIncidentResponsePlan(parsed, issues, context.upstreamArtifacts || {});
  } else {
    validateStatus(parsed, ["interview_required", "recommendation_ready"], issues);
    validateAdvisor(parsed, issues, context.upstreamArtifacts || {});
  }

  return {
    ...finalize(
      context.boxType,
      String(parsed.artifact_type || ""),
      String(parsed.schema_version || ""),
      typeof parsed.status === "string" ? parsed.status : "",
      issues,
      assessmentDate,
      now,
    ),
    parsed,
  };
}

/**
 * Checks direct inputs immediately before a downstream model call. Legacy
 * boards are validated on demand; only invalid output blocks the workflow.
 */
export function securityUpstreamGate(
  target: SecurityArtifactBoxType,
  upstream: SecurityArtifactUpstream[],
): { message: string | null; validations: Array<{ source: SecurityArtifactUpstream; validation: SecurityArtifactValidationResult }> } {
  if (target === "assetmapper") return { message: null, validations: [] };
  const validations = upstream.map((source) => ({
    source,
    validation: source.validation
      ? source.validation
      : validateSecurityArtifact({ boxType: source.boxType, output: source.output }),
  }));
  const invalid = validations.find(({ validation }) => validation.status === "invalid");
  if (!invalid) return { message: null, validations };
  const name = invalid.source.title || artifactLabel(invalid.source.boxType);
  const next = artifactLabel(target);
  return {
    message: `${name} produced an invalid structured artifact. Fix or rerun it before running ${next}.`,
    validations,
  };
}

function artifactLabel(type: SecurityArtifactBoxType): string {
  return ({
    assetmapper: "Asset Mapper",
    reqelicitor: "Security Requirements Elicitor",
    nistgap: "NIST CSF Gap Checker",
    securityadvisor: "Security Advisor",
    threatModeler: "Threat Modeler",
    riskScorer: "Risk Scorer",
    irPlanner: "IR Planner",
  })[type];
}

function finalize(
  boxType: SecurityArtifactBoxType,
  artifactType: string,
  schemaVersion: string,
  artifactStatus: string,
  issues: SecurityArtifactValidationIssue[],
  assessmentDate: string,
  validatedAt: number,
): SecurityArtifactValidationResult {
  const hasErrors = issues.some((entry) => entry.severity === "error");
  const clarification = !hasErrors && (
    artifactStatus === "clarification_required" || artifactStatus === "interview_required"
  );
  // The caller's parsed status is applied below where available; keeping this helper
  // JSON-only prevents parser objects or Date instances entering persisted BoxData.
  return {
    status: hasErrors ? "invalid" : clarification ? "clarification_required" : issues.length ? "warning" : "valid",
    artifactType,
    schemaVersion,
    issues,
    validatedAt,
    trustedMetadata: { assessmentDate },
  };
}
