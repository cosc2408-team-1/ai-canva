import { useState } from "react";
import type { SecurityArtifactSummary as Summary, SummaryItem } from "../lib/securityArtifactSummary.js";

function ClarificationList({ items }: { items: SummaryItem[] }) {
  const [showAll, setShowAll] = useState(false);
  if (!items.length) return null;
  const visible = showAll ? items : items.slice(0, 3);
  const remaining = items.length - visible.length;

  return (
    <div className="mt-3 border-t border-slate-200 pt-2.5">
      <p className="text-xs font-semibold text-slate-800">More information needed</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-700">
        {visible.map((item, index) => (
          <li key={`${index}-${item.text}`}>
            {item.text}
            {item.detail && <span className="mt-0.5 block text-[11px] text-slate-500">{item.detail}</span>}
          </li>
        ))}
      </ul>
      {remaining > 0 && <p className="mt-1 text-xs text-slate-500">+ {remaining} more</p>}
      {items.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          aria-expanded={showAll}
          className="mt-1 min-h-9 rounded px-1 text-xs font-medium text-indigo-700 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {showAll ? "Show less" : `Show all questions (${items.length})`}
        </button>
      )}
    </div>
  );
}

function ShortList({ heading, items }: { heading: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-3 border-t border-slate-200 pt-2.5">
      <p className="text-xs font-semibold text-slate-800">{heading}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-700">
        {items.slice(0, 3).map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
      </ul>
      {items.length > 3 && <p className="mt-1 text-xs text-slate-500">+ {items.length - 3} more in Technical artifact</p>}
    </div>
  );
}

export default function SecurityArtifactSummary({ summary, needsClarification }: {
  summary: Summary;
  needsClarification: boolean;
}) {
  const advisor = summary.kind === "securityadvisor";
  return (
    <section aria-label="Security result summary" className="px-3 pb-2 text-slate-700">
      <h3 className="text-sm font-semibold text-slate-900">{summary.title}</h3>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{summary.description}</p>

      {summary.frameworkVersion && (
        <p className="mt-2 text-xs font-medium text-teal-700">{summary.frameworkVersion}</p>
      )}
      {summary.metrics.length > 0 && (
        <dl className="mt-2 flex flex-wrap gap-1.5">
          {summary.metrics.map((metric) => (
            <div key={metric.label} className="flex items-baseline gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
              <dt className="text-slate-600">{metric.label}</dt>
              <dd className="font-semibold text-slate-900">{metric.count}</dd>
            </div>
          ))}
        </dl>
      )}

      {summary.examples.length > 0 && <ShortList heading="Identified assets" items={summary.examples} />}

      {advisor && summary.recommendedNextStep && (
        <div className="mt-3 border-t border-slate-200 pt-2.5 text-xs leading-relaxed">
          <p className="font-semibold text-slate-800">Recommended next step</p>
          <p className="mt-1 text-slate-700">{summary.recommendedNextStep}</p>
          {summary.reason && <>
            <p className="mt-2 font-semibold text-slate-800">Why this step</p>
            <p className="mt-1 text-slate-700">{summary.reason}</p>
          </>}
        </div>
      )}

      {needsClarification && <ClarificationList items={summary.clarificationItems} />}
      {advisor && <ShortList heading="Inputs to prepare" items={summary.inputsToPrepare} />}
      {advisor && <ShortList heading="Human review from guidance" items={summary.humanReview} />}
      {advisor && summary.confidence && (
        <p className="mt-2 text-xs text-slate-600"><span className="font-semibold">Confidence:</span> {summary.confidence}</p>
      )}

      {needsClarification && summary.nextAction && !advisor && (
        <p className="mt-3 border-t border-slate-200 pt-2.5 text-xs leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-800">Next step:</span> {summary.nextAction}
        </p>
      )}
    </section>
  );
}
