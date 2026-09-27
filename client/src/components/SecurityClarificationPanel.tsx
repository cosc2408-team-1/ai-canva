import { useMemo, useState } from "react";
import type {
  SecurityArtifactBoxType,
  SecurityArtifactValidation,
  SecurityClarification,
  SecurityClarificationOverride,
} from "../types.js";
import {
  MAX_CLARIFICATION_ANSWER_CHARS,
  clarificationOverrideActive,
  extractClarificationQuestions,
  mergeClarificationAnswers,
} from "../lib/securityClarifications.js";
import { Button } from "./ui/Button.js";

/** Only packages whose clarification gates the NIST CSF Gap Checker offer Proceed. */
const PROCEED_BOX_TYPES: readonly SecurityArtifactBoxType[] = ["assetmapper", "reqelicitor"];

export interface SecurityClarificationControls {
  entries: SecurityClarification[];
  override?: SecurityClarificationOverride;
  /** Attribution for edited answers. */
  actor: string;
  /** Running is disabled while the box (or a board-level run) is busy. */
  busy?: boolean;
  onSave: (entries: SecurityClarification[]) => void;
  onSaveAndRerun: (entries: SecurityClarification[]) => void;
  onProceed: () => void;
  onUndoProceed: () => void;
}

function formatTime(ms: number): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

function AnswerField({ id, label, value, onChange }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-1 flex items-start gap-1.5">
      <textarea
        id={id}
        aria-label={label}
        value={value}
        maxLength={MAX_CLARIFICATION_ANSWER_CHARS}
        rows={2}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Your answer (leave blank to skip)"
        className="nodrag nowheel min-h-[2.5rem] flex-1 resize-y rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
      <Button type="button" size="xs" variant="ghost" onClick={() => onChange("unknown")} title="Record that this is not known yet">
        I don't know
      </Button>
    </div>
  );
}

/**
 * Lets the user answer the clarification questions a security box asked. Answers
 * are stored on the box and passed to its next run as user-reported evidence;
 * drafts stay local until Save so typing never writes to the board.
 */
export default function SecurityClarificationPanel({ boxType, output, validation, needsClarification, controls }: {
  boxType: SecurityArtifactBoxType;
  output: string;
  validation?: SecurityArtifactValidation;
  needsClarification: boolean;
  controls: SecurityClarificationControls;
}) {
  const { entries, override, actor, busy = false } = controls;
  const questions = useMemo(
    () => needsClarification ? extractClarificationQuestions(boxType, output) : [],
    [boxType, output, needsClarification],
  );
  const questionKeys = useMemo(() => new Set(questions.map((question) => question.key)), [questions]);
  const scripted = entries.filter((entry) => entry.source === "demo-script");
  const previous = entries.filter((entry) => entry.source !== "demo-script" && !questionKeys.has(entry.key));
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(entries.map((entry) => [entry.key, entry.answer])));
  const [showPrevious, setShowPrevious] = useState(false);

  const setDraft = (key: string, value: string) => setDrafts((current) => ({ ...current, [key]: value }));
  const draftFor = (key: string) => drafts[key] ?? "";
  const merged = () => mergeClarificationAnswers(entries, questions, drafts, actor, Date.now());
  const dirty = merged() !== entries;
  const proceeded = clarificationOverrideActive(override, validation);
  const canProceed = needsClarification && PROCEED_BOX_TYPES.includes(boxType);

  if (!needsClarification && entries.length === 0) return null;

  const previousList = (list: SecurityClarification[], heading: string, open: boolean, toggle?: () => void) => list.length > 0 && (
    <div className="mt-2 border-t border-violet-100 pt-2">
      {toggle ? (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="text-xs font-semibold text-violet-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >{open ? "▾" : "▸"} {heading} ({list.length})</button>
      ) : <p className="text-xs font-semibold text-violet-800">{heading} ({list.length})</p>}
      {open && (
        <ul className="mt-1 space-y-2">
          {list.map((entry, index) => (
            <li key={entry.key}>
              <p className="text-xs text-slate-800">{entry.question}</p>
              <AnswerField
                id={`clarification-prev-${index}`}
                label={`Answer: ${entry.question}`}
                value={draftFor(entry.key)}
                onChange={(value) => setDraft(entry.key, value)}
              />
              <p className="mt-0.5 text-[10px] text-slate-500">
                {entry.answeredBy ? `Answered by ${entry.answeredBy}` : ""}{entry.answeredAt ? ` · ${formatTime(entry.answeredAt)}` : ""}
                {" · "}
                <button type="button" className="text-rose-700 hover:underline" onClick={() => setDraft(entry.key, "")}>Remove</button>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <section
      data-testid="security-clarification-panel"
      aria-label="Clarification questions"
      className="nodrag mx-3 mb-3 rounded-md border border-violet-200 bg-violet-50/60 px-2.5 py-2"
    >
      {needsClarification ? (
        <>
          <p className="text-xs font-semibold text-violet-900">Answer the questions this box needs</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-violet-800">
            Answers are sent to the AI as user-reported evidence on the next run. Don't include passwords, keys, tokens or personal data.
          </p>
          {questions.length > 0 ? (
            <ol className="mt-2 space-y-2.5">
              {questions.map((question, index) => (
                <li key={question.key}>
                  <label htmlFor={`clarification-${index}`} className="block text-xs font-medium text-slate-900">{index + 1}. {question.question}</label>
                  {question.whyItMatters && <p className="text-[11px] text-slate-600">Why it matters: {question.whyItMatters}</p>}
                  {question.evidenceNeeded && <p className="text-[11px] text-slate-600">Evidence needed: {question.evidenceNeeded}</p>}
                  <AnswerField
                    id={`clarification-${index}`}
                    label={`Answer: ${question.question}`}
                    value={draftFor(question.key)}
                    onChange={(value) => setDraft(question.key, value)}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-xs text-slate-600">No specific questions were listed. Inspect the technical artifact, add evidence upstream, then rerun.</p>
          )}
        </>
      ) : (
        <p className="text-xs font-semibold text-violet-900">Clarification answers used by this box</p>
      )}

      {previousList(scripted, "Scripted demo answers (fictional)", true)}
      {previousList(previous, needsClarification ? "Previously answered" : "Answers supplied", showPrevious, () => setShowPrevious((open) => !open))}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button type="button" size="xs" variant="primary" disabled={busy || (!dirty && !entries.length)} onClick={() => controls.onSaveAndRerun(merged())}>
          Save &amp; rerun
        </Button>
        <Button type="button" size="xs" disabled={!dirty} onClick={() => controls.onSave(merged())}>
          Save answers
        </Button>
        {canProceed && !proceeded && (
          <Button type="button" size="xs" variant="ghost" onClick={controls.onProceed} title="Let downstream boxes run on this partial package; it stays marked as needing clarification">
            Proceed with unresolved questions
          </Button>
        )}
      </div>
      {canProceed && proceeded && override && (
        <p data-testid="clarification-override" className="mt-2 text-[11px] text-violet-900">
          Proceeded with unresolved questions: {override.by}{override.at ? ` · ${formatTime(override.at)}` : ""}.{" "}
          <button type="button" className="font-medium underline" onClick={controls.onUndoProceed}>Undo</button>
        </p>
      )}
    </section>
  );
}
