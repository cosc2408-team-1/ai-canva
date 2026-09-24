import { BOX_TYPES } from "../types.js";
import { securityWorkflowStages } from "../lib/securityWorkflow.js";

const GUIDANCE = {
  discover: "Identify assets and evidence.",
  specify: "Turn evidence into testable requirements.",
  assess: "Compare requirements and evidence against NIST CSF.",
  advise: "Review next actions and open questions.",
} as const;

export default function SecurityWorkflowGuide() {
  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2.5" aria-labelledby="security-workflow-title">
      <h2 id="security-workflow-title" className="text-sm font-semibold text-slate-900">
        Security Engineering
      </h2>
      <p className="mt-1 text-[10px] font-medium text-slate-500">Discover → Specify → Assess → Advise</p>
      <ol className="mt-3 space-y-2">
        {securityWorkflowStages().map((stage) => (
          <li key={stage.id} className="grid grid-cols-[18px_1fr] items-start gap-2">
            <span className="mt-0.5 grid h-4 w-4 place-items-center rounded-full border border-slate-300 bg-white text-[9px] font-semibold text-slate-700" aria-label={`Stage ${stage.order}`}>
              {stage.order}
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold leading-snug text-slate-900">
                {BOX_TYPES[stage.boxType].label}
              </h3>
              <p className="mt-0.5 text-[9px] font-semibold uppercase leading-tight text-teal-800">{stage.shortLabel}</p>
              <p className="text-[10px] leading-snug text-slate-600">{GUIDANCE[stage.id]}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-2 text-[10px] leading-snug">
        <p className="text-slate-600"><strong className="font-semibold text-slate-800">Traceability:</strong> Stable IDs show where information came from, not whether it is true.</p>
        <p className="text-slate-600"><strong className="font-semibold text-slate-800">Human review:</strong> AI assists analysis; people make security and release decisions.</p>
        <div aria-label="Artifact status meanings" className="space-y-0.5 text-slate-600">
          <p className="font-semibold text-slate-800">Status:</p>
          <p>✓ Valid — structure and references checked</p>
          <p>? Needs clarification — more input required</p>
          <p>✕ Invalid — fix before downstream use</p>
        </div>
      </div>
    </section>
  );
}
