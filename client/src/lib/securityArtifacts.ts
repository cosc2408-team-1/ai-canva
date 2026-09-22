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
};

const REQUIRED: Record<SecurityArtifactBoxType, string[]> = {
  assetmapper: ["artifact_type", "schema_version", "case_id", "status", "assessment_boundary", "assets", "evidence_register", "assumptions", "open_questions", "limitations"],
  reqelicitor: ["artifact_type", "schema_version", "case_id", "status", "assessment_boundary", "assets", "requirements", "evidence_register", "assumptions", "open_questions", "limitations"],
  nistgap: ["artifact_type", "schema_version", "report_id", "assessment_date", "status", "framework_version", "scope_boundary", "exclusions", "requirements_package", "function_coverage", "findings", "unmapped_requirements", "unassessed_areas", "limitations"],
  securityadvisor: ["artifact_type", "schema_version", "status"],
};

const ARTIFACT_TYPES: Record<SecurityArtifactBoxType, string> = {
  assetmapper: "AssetPackage",
  reqelicitor: "RequirementsPackage",
  nistgap: "NISTAssessmentPackage",
  securityadvisor: "NextStepGuidance",
};

const REFERENCE_FIELDS = new Set([
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
  prefix: "AST" | "EVID" | "REQ" | "GAP",
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
  const next = target === "reqelicitor"
    ? "Security Requirements Elicitor"
    : target === "nistgap"
      ? "NIST CSF Gap Checker"
      : "Security Advisor";
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
