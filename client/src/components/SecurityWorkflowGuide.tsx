import { securityWorkflowStages } from "../lib/securityWorkflow.js";

export default function SecurityWorkflowGuide() {
  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2.5" aria-labelledby="security-workflow-title">
      <h2 id="security-workflow-title" className="text-xs font-semibold text-slate-700">
        Security Engineering
      </h2>
      <p className="mt-1 text-[10px] font-medium text-slate-500">Discover → Specify → Assess → Advise</p>
      <ol className="mt-2 space-y-1.5">
        {securityWorkflowStages().map((stage) => (
          <li key={stage.id} className="grid grid-cols-[18px_1fr] gap-1.5 items-start">
            <span className="mt-px grid h-4 w-4 place-items-center rounded-full border border-slate-300 bg-white text-[9px] font-semibold text-slate-600" aria-label={`Stage ${stage.order}`}>
              {stage.order}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold leading-tight text-slate-700">
                {stage.actionLabel} <span className="font-normal text-slate-500">· {stage.description}</span>
              </p>
              <p className="text-[9px] leading-tight text-slate-500">{stage.evidenceCue}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-2 border-t border-slate-200 pt-1.5 text-[9px] leading-snug text-slate-500">
        Evidence-linked IDs flow through the workflow; IDs do not prove facts.
      </p>
      <p className="mt-1 text-[9px] leading-snug text-slate-600" title="Review generated analysis before technical validation, risk acceptance, production, privacy, legal or compliance decisions.">
        AI-assisted preliminary analysis. Human review remains required.
      </p>
      <p className="mt-1 text-[9px] leading-snug text-slate-500" aria-label="Artifact status meanings">
        ✓ Valid = format/reference integrity · ? Clarification = human input · ✕ Invalid = fix before downstream use
      </p>
    </section>
  );
}
