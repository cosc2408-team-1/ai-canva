import { useEffect, useMemo, useState } from "react";
import type { SecurityArtifactBoxType, SecurityArtifactValidation } from "../types.js";
import { securityWorkflowStageForBoxType } from "../lib/securityWorkflow.js";
import { summarizeSecurityArtifact } from "../lib/securityArtifactSummary.js";
import SecurityArtifactStatus from "./SecurityArtifactStatus.js";
import SecurityArtifactSummary from "./SecurityArtifactSummary.js";

export function TechnicalArtifact({ output }: { output: string }) {
  return (
    <div className="mx-3 mb-2">
      <p className="mb-1 text-[11px] text-slate-500">Exact generated YAML used by downstream stages.</p>
      <pre
        data-testid="security-technical-artifact"
        className="nowheel max-h-72 overflow-auto whitespace-pre-wrap break-words rounded border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] leading-relaxed text-slate-700"
      >{output}</pre>
    </div>
  );
}

function HumanReviewCue({ boxType }: { boxType: SecurityArtifactBoxType }) {
  const cue = securityWorkflowStageForBoxType(boxType)?.humanReviewCue;
  return (
    <div className="mx-3 mb-2 border-t border-slate-200 pt-2.5 text-[11px] leading-relaxed text-slate-600">
      <p className="font-semibold text-slate-800">Human review before decisions</p>
      {cue && <p className="mt-0.5">{cue}</p>}
      <p
        className="mt-0.5"
        title="An appropriate person in the project team can confirm facts. An external audit is not automatically required."
      >
        AI-assisted decision support, not approval or a compliance determination. People confirm facts before risk, release, privacy, legal or compliance decisions.
      </p>
    </div>
  );
}

export default function SecurityArtifactResult({ boxType, output, validation, isError = false }: {
  boxType: SecurityArtifactBoxType;
  output: string;
  validation?: SecurityArtifactValidation;
  isError?: boolean;
}) {
  const [view, setView] = useState<"summary" | "technical">("summary");
  useEffect(() => setView("summary"), [output]);

  const hasOutput = Boolean(output.trim());
  const invalid = validation?.status === "invalid";
  const summary = useMemo(
    () => hasOutput && !invalid && !isError ? summarizeSecurityArtifact(boxType, output) : null,
    [boxType, output, hasOutput, invalid, isError],
  );
  const needsClarification = validation?.status === "clarification_required"
    || (!validation && (summary?.sourceStatus === "clarification_required" || summary?.sourceStatus === "interview_required"));

  return (
    <>
      <SecurityArtifactStatus validation={validation} hasOutput={hasOutput} />
      {hasOutput && (
        <>
          {isError && <p className="mx-3 mb-2 text-xs text-amber-700">Previous artifact shown below. The latest run failed.</p>}
          <div className="mx-3 mb-3 flex gap-1 border-b border-slate-200 pb-1" aria-label="Security result view">
            <button
              type="button"
              onClick={() => setView("summary")}
              aria-pressed={view === "summary"}
              className={`min-h-9 rounded px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${view === "summary" ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-50"}`}
            >Summary</button>
            <button
              type="button"
              onClick={() => setView("technical")}
              aria-pressed={view === "technical"}
              className={`min-h-9 rounded px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${view === "technical" ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-50"}`}
            >Technical artifact</button>
          </div>

          {view === "technical" ? <TechnicalArtifact output={output} /> : (
            invalid || isError ? (
              <p className="mx-3 mb-3 text-xs text-rose-700">
                {invalid ? "Summary unavailable: artifact integrity check failed." : "Summary unavailable for the previous result."}
              </p>
            ) : summary ? (
              <>
                {needsClarification && (
                  <p className="mx-3 mb-2 text-xs leading-relaxed text-violet-700">
                    AI Canva produced a partial result, but more project evidence or clarification would improve it.
                  </p>
                )}
                <SecurityArtifactSummary key={output} summary={summary} needsClarification={needsClarification} />
              </>
            ) : <p className="mx-3 mb-3 text-xs text-slate-600">Summary unavailable. Inspect the technical artifact.</p>
          )}
          <HumanReviewCue boxType={boxType} />
        </>
      )}
    </>
  );
}
