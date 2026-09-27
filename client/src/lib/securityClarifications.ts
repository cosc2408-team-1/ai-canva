import { parseDocument, stringify } from "yaml";
import type {
  SecurityArtifactBoxType,
  SecurityArtifactValidation,
  SecurityClarification,
  SecurityClarificationOverride,
} from "../types.js";
import { readArtifactQuestions } from "./securityArtifactSummary.js";

// ============================================================
// Security clarifications — the user's answers to the questions a security box
// asked (open_questions / focused_questions). Answers live on the asking box,
// carry across rounds, and are fed into that box's next run as a labelled,
// self-describing input. The NIST CSF Gap Checker is gated on an upstream
// package that still needs clarification unless the user explicitly proceeds.
// ============================================================

/** Keeps the board document well under Firestore's 1MB limit. */
export const MAX_CLARIFICATIONS = 40;
export const MAX_CLARIFICATION_ANSWER_CHARS = 2000;

/** The NamedInput name the answers are passed under. */
export const CLARIFICATION_INPUT_NAME = "Clarification answers";

export interface ClarificationQuestion {
  key: string;
  question: string;
  whyItMatters: string;
  evidenceNeeded: string;
}

/** Normalized question text, so a repeated question in a later round keeps its answer. */
export function clarificationKey(question: string): string {
  return question.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** The questions the current artifact asks, in artifact order, deduplicated by key. */
export function extractClarificationQuestions(
  boxType: SecurityArtifactBoxType,
  output: string,
): ClarificationQuestion[] {
  let artifact: Record<string, unknown> | null = null;
  try {
    const document = parseDocument(output, { uniqueKeys: true });
    if (document.errors.length) return [];
    const value = document.toJS({ maxAliasCount: 0 });
    artifact = value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return [];
  }
  if (!artifact) return [];
  const raw = boxType === "securityadvisor"
    ? (readArtifactQuestions(artifact.focused_questions).length
        ? artifact.focused_questions
        : artifact.questions)
    : artifact.open_questions;
  const seen = new Set<string>();
  return readArtifactQuestions(raw).flatMap((entry) => {
    const key = clarificationKey(entry.question);
    if (!key || seen.has(key)) return [];
    seen.add(key);
    return [{
      key,
      question: entry.question.trim(),
      whyItMatters: entry.whyItMatters?.trim() || "",
      evidenceNeeded: entry.evidenceNeeded?.trim() || "",
    }];
  });
}

function clampAnswer(answer: string): string {
  return answer.trim().slice(0, MAX_CLARIFICATION_ANSWER_CHARS);
}

function sameEntries(a: SecurityClarification[], b: SecurityClarification[]): boolean {
  return a.length === b.length && a.every((entry, index) => {
    const other = b[index];
    return entry.key === other.key
      && entry.question === other.question
      && entry.whyItMatters === other.whyItMatters
      && entry.answer === other.answer
      && entry.answeredBy === other.answeredBy
      && entry.answeredAt === other.answeredAt
      && entry.round === other.round
      && entry.source === other.source;
  });
}

/**
 * Applies answer drafts (keyed by question key) to the stored answers.
 * - Only answered entries are stored; a blank draft removes an answer.
 * - Answers from earlier rounds are kept even when the question is no longer
 *   asked, so they keep reaching later runs.
 * - An edited answer is attributed to `actor`; an untouched one keeps its author.
 * Returns the SAME array when nothing changed, so a no-op save never dirties the board.
 */
export function mergeClarificationAnswers(
  existing: SecurityClarification[] | undefined,
  questions: ClarificationQuestion[],
  drafts: Record<string, string>,
  actor: string,
  now: number,
): SecurityClarification[] {
  const current = existing || [];
  const byKey = new Map(current.map((entry) => [entry.key, entry]));
  const nextRound = current.reduce((max, entry) => Math.max(max, entry.round), 0) + 1;
  const next: SecurityClarification[] = [];
  const placed = new Set<string>();

  const place = (key: string, question: string, whyItMatters: string) => {
    if (placed.has(key)) return;
    placed.add(key);
    const previous = byKey.get(key);
    const draft = Object.prototype.hasOwnProperty.call(drafts, key) ? drafts[key] : undefined;
    const answer = clampAnswer(draft ?? previous?.answer ?? "");
    if (!answer) return;
    if (previous && previous.answer === answer) {
      next.push(previous);
      return;
    }
    next.push({
      key,
      question: previous?.question || question,
      whyItMatters: previous?.whyItMatters || whyItMatters,
      answer,
      answeredBy: actor,
      answeredAt: now,
      round: previous?.round || nextRound,
      source: "user",
    });
  };

  // Earlier answers keep their order; newly answered questions follow in artifact order.
  for (const entry of current) place(entry.key, entry.question, entry.whyItMatters);
  for (const question of questions) place(question.key, question.question, question.whyItMatters);

  const capped = next.slice(0, MAX_CLARIFICATIONS);
  return sameEntries(capped, current) ? current : capped;
}

/**
 * Inserts or replaces entries by key (used for the Jennie demo's scripted answers),
 * keeping every other stored answer. Returns the same array when nothing changed.
 */
export function upsertClarifications(
  existing: SecurityClarification[] | undefined,
  entries: SecurityClarification[],
): SecurityClarification[] {
  const current = existing || [];
  const incoming = new Map(entries.map((entry) => [entry.key, entry]));
  const next = current.map((entry) => {
    const replacement = incoming.get(entry.key);
    if (!replacement) return entry;
    incoming.delete(entry.key);
    return replacement.answer === entry.answer && replacement.source === entry.source ? entry : replacement;
  });
  next.push(...incoming.values());
  const capped = next.slice(0, MAX_CLARIFICATIONS);
  return sameEntries(capped, current) ? current : capped;
}

/**
 * The labelled input a security box receives on its next run. The instructions
 * travel with the answers, so boards whose prompts predate this feature still
 * treat them correctly. Returns null when there is nothing answered.
 */
export function buildClarificationInput(entries: SecurityClarification[] | undefined): string | null {
  const answered = (entries || []).filter((entry) => entry.answer.trim());
  if (!answered.length) return null;
  const yaml = stringify({
    questions_and_answers: answered.map((entry) => ({ question: entry.question, answer: entry.answer })),
  }, { lineWidth: 0 });
  return [
    "Answers to previous clarification questions (supplied by the user). Treat each answer as",
    "user_reported evidence and record it in evidence_register with an EVID-* id. Do not re-ask",
    "answered questions. Keep answers of \"unknown\" as unresolved unknowns, never as proof that a",
    "control is absent. Return status complete only if no essential question remains.",
    "",
    yaml.trimEnd(),
  ].join("\n");
}

/** An override only counts for the exact output it was granted for. */
export function clarificationOverrideActive(
  override: SecurityClarificationOverride | undefined,
  validation: Pick<SecurityArtifactValidation, "validatedAt"> | undefined,
): boolean {
  return Boolean(override && validation && override.validatedAt === validation.validatedAt);
}

/**
 * Runtime-only prompt note appended when the user proceeded past unresolved
 * upstream questions (same pattern as nistTrustedMetadataPrompt).
 */
export function clarificationBypassPrompt(sources: string[]): string {
  if (!sources.length) return "";
  return `\n\nTrusted application note:\nThe user chose to proceed although ${sources.join(" and ")} still has status clarification_required.\n\nInstructions:\n- Treat its open questions as unresolved unknowns: use unknown or an evidence_gap, never not_implemented, for outcomes that depend on them.\n- State in limitations that the assessment proceeded with unresolved upstream clarification questions.`;
}
