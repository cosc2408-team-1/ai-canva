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
  threatModeler: "ThreatModel",
  riskScorer: "RiskRegister",
  irPlanner: "IncidentResponsePlan",
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

  if (boxType === "threatModeler") return summarizeThreatModel(base, artifact, questionSection);
  if (boxType === "riskScorer") return summarizeRiskRegister(base, artifact, questionSection);
  if (boxType === "irPlanner") return summarizeIncidentResponsePlan(base, artifact, questionSection);

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

// ---------------------------------------------------------------------------
// Team 2 summaries: ThreatModel, RiskRegister, IncidentResponsePlan.
// ---------------------------------------------------------------------------

type QuestionSection = (value: unknown, emptyText?: string) => SummarySection;

function joinParts(...parts: Array<string | undefined>): string | undefined {
  const present = parts.filter((part): part is string => Boolean(part && part.trim()));
  return present.length ? present.join(" · ") : undefined;
}

function refs(value: unknown): string | undefined {
  const entries = (list(value) || []).map(text).filter((entry): entry is string => Boolean(entry));
  return entries.length ? entries.join(", ") : undefined;
}

function labelled(id: string | undefined, body: string | undefined, fallback: string): string {
  return id && body ? `${id} — ${body}` : id || body || fallback;
}

function summarizeThreatModel(
  base: SecurityArtifactSummary,
  artifact: ArtifactRecord,
  questionSection: QuestionSection,
): SecurityArtifactSummary | null {
  const threats = list(artifact.threats);
  if (!threats) return null;
  const items = threats.flatMap((entry): SummaryItem[] => {
    const threat = record(entry);
    if (!threat) return [];
    const id = text(threat.id);
    const mapping = record(threat.attack_mapping);
    const technique = mapping && text(mapping.technique_id) && text(mapping.technique_id)!.toLowerCase() !== "unknown"
      ? `ATT&CK ${text(mapping.technique_id)}${mapping.match === "closest" ? " (closest match)" : ""}`
      : "ATT&CK: no confident match";
    return [{
      text: labelled(id, text(threat.threat), "Threat"),
      detail: joinParts(refs(threat.asset_refs), text(threat.stride_category), technique, text(threat.attack_vector)),
    }];
  });
  const stride = new Set(threats.map((entry) => text(record(entry)?.stride_category)).filter(Boolean));
  const unmodelled = list(artifact.unmodelled_asset_refs);
  const sections: SummarySection[] = [
    section("threats", "Threat excerpts", items, "Show all threats", "No threats reported in this artifact."),
  ];
  if (unmodelled?.length) {
    sections.push(excerptSection("unmodelled", "Assets not modelled", unmodelled, [], [], [], "Show all assets not modelled", "Every supplied asset was modelled."));
  }
  sections.push(questionSection(artifact.open_questions));
  return {
    ...base,
    title: "Threats modelled",
    description: "STRIDE threats written as conditional scenarios, not confirmed weaknesses.",
    metrics: countMetrics(
      metric(artifact.threats, "Threats"),
      { label: "STRIDE categories", count: stride.size },
      metric(artifact.open_questions, "Questions"),
    ),
    sections,
    nextAction: "Verify ATT&CK mappings against attack.mitre.org before relying on them.",
  };
}

function summarizeRiskRegister(
  base: SecurityArtifactSummary,
  artifact: ArtifactRecord,
  questionSection: QuestionSection,
): SecurityArtifactSummary | null {
  const risks = list(artifact.risks);
  if (!risks) return null;
  const levels = { High: 0, Medium: 0, Low: 0 } as Record<string, number>;
  const items = risks.flatMap((entry): SummaryItem[] => {
    const risk = record(entry);
    if (!risk) return [];
    const id = text(risk.id);
    const level = text(risk.risk_level);
    if (level && level in levels) levels[level] += 1;
    const score = typeof risk.risk_score === "number" ? `Risk ${risk.risk_score}${level ? ` ${level}` : ""}` : level;
    const factors = typeof risk.likelihood === "number" && typeof risk.impact === "number"
      ? `L${risk.likelihood} × I${risk.impact}`
      : undefined;
    const uncertainty = text(risk.uncertainty) ? `Uncertainty ${text(risk.uncertainty)}` : undefined;
    return [{
      text: labelled(id, text(risk.scenario), "Risk"),
      detail: joinParts(refs(risk.threat_refs), score, factors, uncertainty),
    }];
  });
  return {
    ...base,
    title: "Risk register",
    description: "Qualitative prioritisation, highest first. Scores and bands are checked by the app.",
    metrics: [
      { label: "High", count: levels.High },
      { label: "Medium", count: levels.Medium },
      { label: "Low", count: levels.Low },
    ],
    sections: [
      section("risks", "Risk excerpts", items, "Show all risks", "No risks reported in this artifact."),
      questionSection(artifact.open_questions),
    ],
    nextAction: "Confirm High-uncertainty scores with the project team before acting on them.",
  };
}

function summarizeIncidentResponsePlan(
  base: SecurityArtifactSummary,
  artifact: ArtifactRecord,
  questionSection: QuestionSection,
): SecurityArtifactSummary | null {
  const phases = record(artifact.phases);
  if (!phases) return null;
  const readiness = artifact.mode === "readiness";
  const decisions: SummaryItem[] = [];
  let actions = 0;
  for (const [phase, value] of Object.entries(phases)) {
    const body = record(value);
    if (!body) continue;
    actions += list(body.actions)?.length || 0;
    for (const decision of list(body.human_decisions) || []) {
      const decisionText = text(decision);
      if (decisionText) decisions.push({ text: decisionText, detail: phase.replace("_", " ") });
    }
  }
  const scenarios = (list(artifact.selected_scenarios) || []).flatMap((entry): SummaryItem[] => {
    const scenario = record(entry);
    if (!scenario) return [];
    const detail = joinParts(refs(scenario.risk_refs), refs(scenario.threat_refs), text(scenario.reason));
    return [{
      text: text(scenario.scenario) || "Scenario",
      ...(detail ? { detail } : {}),
    }];
  });
  const sections: SummarySection[] = [];
  if (readiness) sections.push(section("scenarios", "Scenarios planned for", scenarios, "Show all scenarios", "No scenarios selected."));
  sections.push(excerptSection("facts", "Known facts", artifact.known_facts, [], ["statement"], ["evidence_refs"], "Show all facts", "No facts supplied."));
  sections.push(section("decisions", "Human decisions required", decisions, "Show all decisions", "No human decisions recorded."));
  sections.push(questionSection(artifact.open_questions));
  return {
    ...base,
    title: readiness ? "Readiness plan" : "Incident response plan",
    description: readiness
      ? "Prepares for the highest-rated scenarios; nothing here has happened yet."
      : "Response to the incident described, across the six PICERL phases.",
    metrics: countMetrics(
      { label: "Phases", count: Object.keys(phases).length },
      { label: "Actions", count: actions },
      { label: "Human decisions", count: decisions.length },
    ),
    sections,
    nextAction: text(artifact.framework_note),
  };
}
