import { parseDocument } from "yaml";
import type { SecurityArtifactBoxType } from "../types.js";

type ArtifactRecord = Record<string, unknown>;

export interface SummaryMetric {
  label: string;
  count: number;
}

export interface SummaryItem {
  text: string;
  detail?: string;
}

export interface SummarySection {
  heading: string;
  items: SummaryItem[];
}

export interface SecurityArtifactSummary {
  kind: SecurityArtifactBoxType;
  sourceStatus: string;
  title: string;
  description: string;
  metrics: SummaryMetric[];
  examples: string[];
  sections: SummarySection[];
  clarificationItems: SummaryItem[];
  nextAction?: string;
  frameworkVersion?: string;
  recommendedNextStep?: string;
  reason?: string;
  inputsToPrepare: string[];
  humanReview: string[];
  confidence?: string;
}

const ARTIFACT_TYPES: Record<SecurityArtifactBoxType, string> = {
  assetmapper: "AssetPackage",
  reqelicitor: "RequirementsPackage",
  nistgap: "NISTAssessmentPackage",
  securityadvisor: "NextStepGuidance",
};

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

function items(value: unknown, keys: readonly string[]): string[] {
  return (list(value) || []).map((entry) => firstItemText(entry, keys)).filter((entry): entry is string => Boolean(entry));
}

function excerptText(value: unknown): string | undefined {
  const direct = text(value);
  if (direct) return direct;
  const entries = list(value);
  if (entries) return entries.map(excerptText).find(Boolean);
  const item = record(value);
  return item ? firstItemText(item, ["text", "statement", "description", "criterion", "method", "subcategory_id", "category_id", "id"]) : undefined;
}

function excerptSection(
  heading: string,
  value: unknown,
  idKeys: readonly string[],
  primaryKeys: readonly string[],
  detailKeys: readonly string[],
): SummarySection[] {
  const excerpts = (list(value) || []).flatMap((entry): SummaryItem[] => {
    const direct = text(entry);
    if (direct) return [{ text: direct }];
    const item = record(entry);
    if (!item) return [];
    const id = idKeys.map((key) => text(item[key])).find(Boolean);
    const primary = primaryKeys.map((key) => excerptText(item[key])).find(Boolean);
    if (!id && !primary) return [];
    const detail = detailKeys.map((key) => excerptText(item[key])).find((value) => value && value !== primary);
    return [{ text: id && primary ? `${id} — ${primary}` : (id || primary)!, ...(detail ? { detail } : {}) }];
  });
  return excerpts.length ? [{ heading, items: excerpts }] : [];
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
    examples: [],
    sections: [],
    clarificationItems: [],
    inputsToPrepare: [],
    humanReview: [],
  };

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
      examples: items(artifact.assets, ["name"]),
      sections: excerptSection("Evidence excerpts", artifact.evidence_register, ["id", "evidence_id"], ["statement", "description", "source"], ["source", "verification_state"]),
      clarificationItems: questions(artifact.open_questions),
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
      sections: excerptSection("Requirement excerpts", artifact.requirements, ["id", "requirement_id"], ["shall_statement", "statement", "requirement", "description"], ["acceptance_criteria", "verification_method", "test_method", "source_refs"]),
      clarificationItems: questions(artifact.open_questions),
      nextAction: "Clarify upstream project evidence, then rerun this stage as appropriate.",
    };
  }

  if (boxType === "nistgap") {
    if (!list(artifact.findings)) return null;
    const unassessed = questions(artifact.unassessed_areas);
    const findingEvidence = (list(artifact.findings) || []).flatMap((finding) => {
      const value = record(finding);
      const evidence = value?.missing_evidence || value?.evidence_needed || value?.validation_needed;
      const single = text(evidence);
      return single ? [{ text: single }] : questions(evidence);
    });
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
      sections: excerptSection("Finding excerpts", artifact.findings, ["id", "gap_id"], ["gap_statement", "finding", "observation", "observed_state", "current_state", "description", "summary", "missing_evidence"], ["evidence_refs", "related_evidence", "related_requirements", "missing_evidence", "validation_needed", "evidence_needed", "target_state"]),
      clarificationItems: [...unassessed, ...findingEvidence],
      nextAction: "Clarify upstream project evidence, then rerun this stage as appropriate.",
    };
  }

  const interview = artifact.status === "interview_required";
  const ready = artifact.status === "recommendation_ready";
  if (!interview && !ready) return null;
  const focused = questions(artifact.focused_questions);
  const fallback = questions(artifact.questions);
  if (interview && !focused.length && !fallback.length) return null;
  if (ready && !text(artifact.recommended_next_step)) return null;
  return {
    ...base,
    title: interview ? "More context needed" : "Recommended next step",
    description: interview
      ? "A few project details could change the recommended route."
      : "Decision support based on the supplied security artifacts.",
    clarificationItems: focused.length ? focused : fallback,
    recommendedNextStep: ready ? text(artifact.recommended_next_step) : undefined,
    reason: ready ? text(artifact.reason) : undefined,
    inputsToPrepare: items(artifact.inputs_to_prepare, ["input", "name", "description", "evidence_needed"]),
    humanReview: items(artifact.human_review, ["action", "review", "description", "reason"]),
    confidence: firstItemText(artifact.confidence, ["level", "label", "value", "confidence"]),
  };
}
