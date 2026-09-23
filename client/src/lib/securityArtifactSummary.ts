import { parseDocument } from "yaml";
import type { SecurityArtifactBoxType } from "../types.js";

type ArtifactRecord = Record<string, unknown>;

export interface SummaryMetric {
  label: string;
  count: number;
}

export interface SummaryItem {
  traceId?: string;
  detailTraceId?: string;
  text: string;
  detail?: string;
}

export interface SummarySection {
  key: string;
  heading: string;
  items: SummaryItem[];
  showAllLabel: string;
  emptyText?: string;
}

export interface SecurityArtifactSummary {
  kind: SecurityArtifactBoxType;
  sourceStatus: string;
  title: string;
  description: string;
  metrics: SummaryMetric[];
  sections: SummarySection[];
  nextAction?: string;
  frameworkVersion?: string;
  guidanceId?: string;
  recommendedNextStep?: string;
  reason?: string;
  confidence?: string;
}

const ARTIFACT_TYPES: Record<SecurityArtifactBoxType, string> = {
  assetmapper: "AssetPackage",
  reqelicitor: "RequirementsPackage",
  nistgap: "NISTAssessmentPackage",
  securityadvisor: "NextStepGuidance",
};

const TRACE_ID_PATTERN = /^(AST|EVID|REQ|GAP|NEXT)-0*[1-9]\d*$/;

function traceId(value: string | undefined): string | undefined {
  return value && TRACE_ID_PATTERN.test(value) ? value : undefined;
}

function record(value: unknown): ArtifactRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as ArtifactRecord
    : null;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function list(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function metric(value: unknown, label: string): SummaryMetric | null {
  const entries = list(value);
  return entries ? { label, count: entries.length } : null;
}

function firstItemText(value: unknown, keys: readonly string[]): string | undefined {
  const direct = text(value);
  if (direct) return direct;
  const item = record(value);
  if (!item) return undefined;
  for (const key of keys) {
    const candidate = item[key];
    const result = text(candidate) || (Array.isArray(candidate) ? candidate.map(text).find(Boolean) : undefined);
    if (result) return result;
  }
  return undefined;
}

function excerptText(value: unknown): string | undefined {
  const direct = text(value);
  if (direct) return direct;
  const entries = list(value);
  if (entries) return entries.map(excerptText).find(Boolean);
  const item = record(value);
  return item ? firstItemText(item, ["text", "statement", "description", "criterion", "method", "subcategory_id", "category_id", "id"]) : undefined;
}

function excerptItems(
  value: unknown,
  idKeys: readonly string[],
  primaryKeys: readonly string[],
  detailKeys: readonly string[],
): SummaryItem[] {
  return (list(value) || []).flatMap((entry): SummaryItem[] => {
    const direct = text(entry);
    if (direct) {
      const id = traceId(direct);
      return [{ ...(id ? { traceId: id } : {}), text: id ? "" : direct }];
    }
    const item = record(entry);
    if (!item) return [];
    const id = idKeys.map((key) => text(item[key])).find(Boolean);
    const stableId = traceId(id);
    const primary = primaryKeys.map((key) => excerptText(item[key])).find(Boolean);
    if (!id && !primary) return [];
    const detail = detailKeys.map((key) => excerptText(item[key])).find((candidate) => candidate && candidate !== primary);
    const detailId = traceId(detail);
    return [{
      ...(stableId ? { traceId: stableId } : {}),
      text: stableId ? (primary || "") : id && primary ? `${id} — ${primary}` : (id || primary)!,
      ...(detailId ? { detailTraceId: detailId } : {}),
      ...(detail ? { detail } : {}),
    }];
  });
}

function section(
  key: string,
  heading: string,
  items: SummaryItem[],
  showAllLabel: string,
  emptyText: string,
): SummarySection {
  return { key, heading, items, showAllLabel, emptyText };
}

function excerptSection(
  key: string,
  heading: string,
  value: unknown,
  idKeys: readonly string[],
  primaryKeys: readonly string[],
  detailKeys: readonly string[],
  showAllLabel: string,
  emptyText: string,
): SummarySection {
  return section(key, heading, excerptItems(value, idKeys, primaryKeys, detailKeys), showAllLabel, emptyText);
}

function questions(value: unknown): SummaryItem[] {
  return (list(value) || []).flatMap((entry) => {
    const question = firstItemText(entry, ["question", "name", "area", "title", "description", "reason", "missing_evidence", "evidence_needed"]);
    if (!question) return [];
    const detail = text(record(entry)?.why_it_matters);
    return [{ text: question, ...(detail ? { detail } : {}) }];
  });
}

function countMetrics(...values: Array<SummaryMetric | null>): SummaryMetric[] {
  return values.filter((value): value is SummaryMetric => value !== null);
}

function optionalStringSection(
  key: string,
  heading: string,
  value: unknown,
  keys: readonly string[],
  showAllLabel: string,
): SummarySection | null {
  if (!Array.isArray(value)) return null;
  const items = value.flatMap((entry): SummaryItem[] => {
    const item = firstItemText(entry, keys);
    return item ? [{ text: item }] : [];
  });
  return section(key, heading, items, showAllLabel, `No ${heading.toLowerCase()} reported in this artifact.`);
}

/** Display-only extraction. Validation and persisted output remain separate. */
export function summarizeSecurityArtifact(
  boxType: SecurityArtifactBoxType,
  output: string,
): SecurityArtifactSummary | null {
  let artifact: ArtifactRecord | null;
  try {
    const document = parseDocument(output, { uniqueKeys: true });
    if (document.errors.length) return null;
    artifact = record(document.toJS({ maxAliasCount: 0 }));
  } catch {
    return null;
  }
  if (!artifact || artifact.artifact_type !== ARTIFACT_TYPES[boxType] || artifact.schema_version !== "1.0") return null;

  const base: SecurityArtifactSummary = {
    kind: boxType,
    sourceStatus: text(artifact.status) || "",
    title: "",
    description: "",
    metrics: [],
    sections: [],
  };
  const questionSection = (value: unknown, emptyText = "No open questions reported in this artifact.") =>
    section("questions", "Open questions", questions(value), "Show all questions", emptyText);

  if (boxType === "assetmapper") {
    if (!list(artifact.assets)) return null;
    return {
      ...base,
      title: "Assets discovered",
      description: "Based on the project information supplied so far.",
      metrics: countMetrics(
        metric(artifact.assets, "Assets"),
        metric(artifact.evidence_register, "Evidence items"),
        metric(artifact.open_questions, "Questions"),
      ),
      sections: [
        excerptSection("assets", "Asset excerpts", artifact.assets, ["id", "asset_id"], ["name", "asset_name", "title"], ["description", "type", "owner", "source_refs"], "Show all assets", "No assets reported in this artifact."),
        excerptSection("evidence", "Evidence excerpts", artifact.evidence_register, ["id", "evidence_id"], ["statement", "description", "source"], ["source", "verification_state"], "Show all evidence", "No evidence items reported in this artifact."),
        questionSection(artifact.open_questions),
      ],
      nextAction: "Update Project Description or connect supporting Documents, then rerun this stage.",
    };
  }

  if (boxType === "reqelicitor") {
    if (!list(artifact.requirements)) return null;
    return {
      ...base,
      title: "Security requirements drafted",
      description: "Evidence-linked requirements from the supplied project information.",
      metrics: countMetrics(
        metric(artifact.assets, "Assets"),
        metric(artifact.requirements, "Requirements"),
        metric(artifact.evidence_register, "Evidence items"),
        metric(artifact.open_questions, "Questions"),
      ),
      sections: [
        excerptSection("assets", "Asset excerpts", artifact.assets, ["id", "asset_id"], ["name", "asset_name", "title"], ["description", "type", "owner", "source_refs"], "Show all assets", "No assets reported in this artifact."),
        excerptSection("requirements", "Requirement excerpts", artifact.requirements, ["id", "requirement_id"], ["shall_statement", "statement", "requirement", "description"], ["acceptance_criteria", "verification_method", "test_method", "source_refs"], "Show all requirements", "No requirements reported in this artifact."),
        excerptSection("evidence", "Evidence excerpts", artifact.evidence_register, ["id", "evidence_id"], ["statement", "description", "source"], ["source", "verification_state"], "Show all evidence", "No evidence items reported in this artifact."),
        questionSection(artifact.open_questions),
      ],
      nextAction: "Clarify upstream project evidence, then rerun this stage as appropriate.",
    };
  }

  if (boxType === "nistgap") {
    if (!list(artifact.findings)) return null;
    const findings = excerptItems(artifact.findings, ["id", "gap_id"], ["gap_statement", "finding", "observation", "observed_state", "current_state", "description", "summary", "missing_evidence"], ["evidence_refs", "related_evidence", "related_requirements", "missing_evidence", "validation_needed", "evidence_needed", "target_state"]);
    const unassessed = excerptItems(artifact.unassessed_areas, ["id", "area_id"], ["area", "question", "title", "description"], ["reason", "missing_evidence", "evidence_needed"]);
    const unmapped = excerptItems(artifact.unmapped_requirements, ["requirement_id", "req_id", "id"], ["shall_statement", "statement", "requirement", "description", "name"], ["reason", "why_unmapped", "missing_evidence"]);
    const represented = new Set([...findings, ...unassessed].flatMap((item) => [item.text, item.detail].filter((value): value is string => Boolean(value)).map((value) => value.trim().toLocaleLowerCase())));
    const distinctQuestions = questions(artifact.open_questions).filter((item) => !represented.has(item.text.trim().toLocaleLowerCase()));
    const sections = [
      section("findings", "Finding excerpts", findings, "Show all findings", "No findings reported in this artifact."),
      section("unmapped", "Unmapped requirement excerpts", unmapped, "Show all unmapped requirements", "No unmapped requirements reported in this artifact."),
      section("unassessed", "Unassessed area excerpts", unassessed, "Show all unassessed areas", "No unassessed areas reported in this artifact."),
    ];
    if (distinctQuestions.length) sections.push(section("questions", "Open questions", distinctQuestions, "Show all questions", "No open questions reported in this artifact."));
    return {
      ...base,
      title: "Preliminary NIST CSF assessment",
      description: "Evidence-limited assessment, not a compliance determination.",
      frameworkVersion: text(artifact.framework_version),
      metrics: countMetrics(
        metric(artifact.findings, "Findings"),
        metric(artifact.unmapped_requirements, "Unmapped requirements"),
        metric(artifact.unassessed_areas, "Unassessed areas"),
      ),
      sections,
      nextAction: "Clarify upstream project evidence, then rerun this stage as appropriate.",
    };
  }

  const interview = artifact.status === "interview_required";
  const ready = artifact.status === "recommendation_ready";
  if (!interview && !ready) return null;
  if (interview && !questions(artifact.focused_questions).length && !questions(artifact.questions).length) return null;
  if (ready && !text(artifact.recommended_next_step)) return null;
  const focusedQuestions = questions(artifact.focused_questions);
  const clarification = focusedQuestions.length ? focusedQuestions : questions(artifact.questions);
  const sections: SummarySection[] = [];
  if (clarification.length) sections.push(section("questions", "Open questions", clarification, "Show all questions", "No open questions reported in this artifact."));
  const inputs = optionalStringSection("inputs", "Inputs to prepare", artifact.inputs_to_prepare, ["input", "name", "description", "evidence_needed"], "Show all inputs");
  const humanReview = optionalStringSection("human-review", "Human review from guidance", artifact.human_review, ["action", "review", "description", "reason"], "Show all review items");
  if (inputs) sections.push(inputs);
  if (humanReview) sections.push(humanReview);
  return {
    ...base,
    title: interview ? "More context needed" : "Recommended next step",
    description: interview
      ? "A few project details could change the recommended route."
      : "Decision support based on the supplied security artifacts.",
    sections,
    guidanceId: text(artifact.guidance_id),
    recommendedNextStep: ready ? text(artifact.recommended_next_step) : undefined,
    reason: ready ? text(artifact.reason) : undefined,
    confidence: ready ? firstItemText(artifact.confidence, ["level", "label", "value", "confidence"]) : undefined,
  };
}
