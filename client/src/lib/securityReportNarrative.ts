import { parseDocument } from "yaml";
import type { SecurityArtifactBoxType } from "../types.js";
import type { SecurityReview, SecurityReviewStage } from "./securityReview.js";

type RecordValue = Record<string, unknown>;

export interface ReportSection {
  heading: string;
  paragraphs: string[];
}

export interface SecurityReportNarrative {
  executiveSummary: string;
  sections: ReportSection[];
}

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue : null;
}

function entries(value: unknown): RecordValue[] {
  return Array.isArray(value) ? value.map(record).filter((item): item is RecordValue => Boolean(item)) : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s*[—–]\s*/g, ", ") : "";
}

function sentence(value: unknown): string {
  const valueText = text(value);
  return valueText ? /[.!?]$/.test(valueText) ? valueText : `${valueText}.` : "";
}

function joined(values: unknown, lowerCase = false): string {
  const parts = Array.isArray(values)
    ? values.map((value) => text(value).replace(/[.!?]+$/, "")).filter(Boolean)
      .map((part) => lowerCase ? part.charAt(0).toLowerCase() + part.slice(1) : part)
    : [];
  if (parts.length < 2) return parts[0] || "";
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

function artifact(stage: SecurityReviewStage): RecordValue | null {
  try {
    const document = parseDocument(stage.output, { uniqueKeys: true });
    return document.errors.length ? null : record(document.toJS({ maxAliasCount: 0 }));
  } catch {
    return null;
  }
}

function countWord(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function riskSection(source: RecordValue): ReportSection {
  const risks = entries(source.risks);
  const paragraphs = [
    `The risk register covers ${countWord(risks.length, "scenario")}. The scores are provisional because they rely on the project information supplied to the board.`,
  ];
  for (const risk of risks) {
    const id = text(risk.id) || "An unnumbered risk";
    const scenario = text(risk.scenario).replace(/[.!?]+$/, "");
    const level = text(risk.risk_level);
    const score = typeof risk.risk_score === "number" ? risk.risk_score : null;
    const likelihood = typeof risk.likelihood === "number" ? risk.likelihood : null;
    const impact = typeof risk.impact === "number" ? risk.impact : null;
    const rating = level && score !== null
      ? `${level} (${score} out of 25)${likelihood !== null && impact !== null ? `, with likelihood ${likelihood} and impact ${impact}` : ""}`
      : "unrated";
    const rationale = text(risk.likelihood_justification);
    const uncertainty = text(risk.uncertainty);
    paragraphs.push([
      `The register rates ${id} ${rating}. The scenario is "${scenario}".`,
      rationale ? `For likelihood, the output cites this basis: ${sentence(rationale)}` : "",
      uncertainty ? `It records ${uncertainty.toLowerCase()} uncertainty.` : "",
    ].filter(Boolean).join(" "));
  }
  return { heading: "Risk assessment", paragraphs };
}

function gapSection(source: RecordValue): ReportSection {
  const findings = entries(source.findings);
  const paragraphs = [
    `The NIST CSF 2.0 assessment records ${countWord(findings.length, "finding")}. These are proposed gaps or missing evidence, not a determination that the portal fails the framework.`,
  ];
  for (const finding of findings) {
    const id = text(finding.id) || "An unnumbered finding";
    const statement = sentence(finding.gap_statement || finding.finding || finding.observation);
    const observed = text(finding.observed_state).replace(/[.!?]+$/, "");
    const target = text(finding.target_state).replace(/[.!?]+$/, "");
    const missing = text(finding.missing_evidence || finding.validation_needed).replace(/[.!?]+$/, "");
    paragraphs.push([
      `${id} records "${statement.replace(/[.!?]+$/, "")}".`,
      observed && target ? `It describes the current state as "${observed}" and the target as "${target}".` : "",
      missing ? `It names "${missing}" as evidence still needed.` : "",
    ].filter(Boolean).join(" "));
  }
  const unassessed = entries(source.unassessed_areas);
  if (unassessed.length) paragraphs.push(`The assessment also leaves ${countWord(unassessed.length, "area")} unassessed because the supplied material does not establish a reliable position.`);
  return { heading: "Security gaps", paragraphs };
}

function requirementsSection(source: RecordValue): ReportSection {
  const requirements = entries(source.requirements);
  const paragraphs = [`The elicitor drafted ${countWord(requirements.length, "security requirement")}. They describe controls to test or implement, not controls already in place.`];
  for (const requirement of requirements) {
    const id = text(requirement.id) || "An unnumbered requirement";
    const statement = text(requirement.shall_statement || requirement.statement).replace(/[.!?]+$/, "");
    const check = text(requirement.verification_method || requirement.test_method || requirement.acceptance_criteria).replace(/[.!?]+$/, "");
    paragraphs.push(`${id} states: "${statement}".${check ? ` It proposes "${check}" as the verification method.` : ""}`);
  }
  return { heading: "Security requirements", paragraphs };
}

function threatSection(source: RecordValue): ReportSection {
  const threats = entries(source.threats);
  const paragraphs = [`The threat model describes ${countWord(threats.length, "conditional scenario")}. None is evidence that an attack has occurred.`];
  for (const threat of threats) {
    const id = text(threat.id) || "An unnumbered threat";
    const scenario = text(threat.threat).replace(/[.!?]+$/, "");
    const vector = text(threat.attack_vector).replace(/[.!?]+$/, "");
    const mitigation = joined(threat.mitigations);
    paragraphs.push([
      `${id} considers "${scenario}" as a possible threat.`,
      vector ? `It describes this route: "${vector}".` : "",
      mitigation ? `The proposed mitigation is "${mitigation}".` : "",
    ].filter(Boolean).join(" "));
  }
  return { heading: "Threat model", paragraphs };
}

function assetSection(source: RecordValue): ReportSection {
  const assets = entries(source.assets);
  const evidence = entries(source.evidence_register);
  const names = joined(assets.map((asset) => asset.name));
  const paragraphs = [
    assets.length
      ? `The asset inventory identifies ${countWord(assets.length, "asset")}: ${sentence(names)}`
      : "The asset inventory does not identify any assets.",
  ];
  const descriptions = assets.map((asset) => sentence(asset.description)).filter(Boolean);
  if (descriptions.length) paragraphs.push(descriptions.join(" "));
  if (evidence.length) paragraphs.push(`The accompanying evidence register contains ${countWord(evidence.length, "statement")}. Those statements are taken from the inputs supplied to the board and remain unverified.`);
  return { heading: "Assets and evidence", paragraphs };
}

function advisorSection(source: RecordValue): ReportSection {
  const step = sentence(source.recommended_next_step);
  const reason = sentence(source.reason);
  const inputs = joined(source.inputs_to_prepare, true);
  const paragraphs = [
    step ? `The advisor recommends the following next step: ${step}` : "The advisor does not yet give a recommendation.",
  ];
  if (reason) paragraphs.push(`The recommendation is based on this assessment: ${reason}`);
  if (inputs) paragraphs.push(`The team would need ${sentence(inputs)}`);
  return { heading: "Recommended action", paragraphs };
}

function incidentSection(source: RecordValue): ReportSection {
  const scenarios = entries(source.selected_scenarios).map((item) => text(item.scenario)).filter(Boolean);
  const phases = record(source.phases);
  const prep = joined(record(phases?.preparation)?.actions);
  const identification = joined(record(phases?.identification)?.actions);
  const containment = joined(record(phases?.containment)?.actions);
  const recovery = joined(record(phases?.recovery)?.actions);
  const readiness = source.mode === "readiness";
  const paragraphs = [
    readiness
      ? `The incident response output is a readiness plan${scenarios.length ? `. It prepares for this scenario: ${sentence(joined(scenarios))}` : ". It does not describe a reported incident."}`
      : `The incident response output addresses the incident described in the board${scenarios.length ? `: ${sentence(joined(scenarios))}` : "."}`,
  ];
  if (prep || identification) paragraphs.push(`For preparation, the plan records "${prep || "Document contacts"}". If the scenario is suspected, it calls for "${identification || "Investigate the event"}".`);
  if (containment || recovery) paragraphs.push(`The containment action is "${containment || "Restrict affected access"}". The recovery action is "${recovery || "Restore normal access after checks"}".`);
  return { heading: "Incident response readiness", paragraphs };
}

const BUILDERS: Record<SecurityArtifactBoxType, (source: RecordValue) => ReportSection> = {
  riskScorer: riskSection,
  nistgap: gapSection,
  reqelicitor: requirementsSection,
  threatModeler: threatSection,
  assetmapper: assetSection,
  securityadvisor: advisorSection,
  irPlanner: incidentSection,
};

const ORDER: SecurityArtifactBoxType[] = [
  "riskScorer", "nistgap", "reqelicitor", "threatModeler",
  "assetmapper", "securityadvisor", "irPlanner",
];

export function buildSecurityReportNarrative(review: SecurityReview): SecurityReportNarrative {
  const included = review.stages.filter((stage) => stage.summary && stage.validationStatus !== "invalid");
  const riskSource = included.find((stage) => stage.type === "riskScorer");
  const riskItems = riskSource ? entries(artifact(riskSource)?.risks) : [];
  const highest = riskItems[0];
  const gapSource = included.find((stage) => stage.type === "nistgap");
  const gapCount = gapSource ? entries(artifact(gapSource)?.findings).length : 0;
  const summary = [
    `This report reviews ${review.boardTitle} using ${countWord(included.length, "saved security output")} from the board.`,
    highest
      ? `The first risk scenario is: ${sentence(highest.scenario)} The register rates it ${text(highest.risk_level).toLowerCase()}.`
      : "",
    gapCount ? `The NIST CSF assessment records ${countWord(gapCount, "gap")} that need further evidence or review.` : "",
    review.stages.some((stage) => stage.sampleOutput)
      ? "The preloaded results are examples for a fictional scenario, not a live assessment of a deployed system."
      : "The outputs are AI-assisted drafts. Their claims still need to be checked against the deployed system.",
  ].filter(Boolean).join(" ");

  const sections: ReportSection[] = [];
  for (const type of ORDER) {
    for (const stage of included.filter((candidate) => candidate.type === type)) {
      const source = artifact(stage);
      if (source) sections.push(BUILDERS[type](source));
    }
  }
  return { executiveSummary: summary, sections };
}
