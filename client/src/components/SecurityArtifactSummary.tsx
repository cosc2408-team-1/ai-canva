import { useState } from "react";
import type { SecurityArtifactSummary as Summary, SummarySection } from "../lib/securityArtifactSummary.js";

function ExpandableSummarySection({ section, needsClarification }: {
  section: SummarySection;
  needsClarification: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const heading = section.key === "questions" && needsClarification ? "More information needed" : section.heading;
  const visible = showAll ? section.items : section.items.slice(0, 3);
  const expandable = section.items.length > 3;

  return (
    <div className="mt-3 border-t border-slate-200 pt-2.5">
      <p className="text-xs font-semibold text-slate-800">{heading}</p>
      {visible.length ? (
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-700">
          {visible.map((item, index) => (
            <li key={`${index}-${item.text}`} className="break-words">
              {item.text}
              {item.detail && <span className="mt-0.5 block text-[11px] text-slate-500">{item.detail}</span>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-1.5 text-xs text-slate-500">{section.emptyText || "No items reported in this artifact."}</p>}
      {expandable && (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          aria-expanded={showAll}
          className="mt-1 min-h-9 rounded px-1 text-xs font-medium text-indigo-700 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {showAll ? "Show less" : `${section.showAllLabel} (${section.items.length})`}
        </button>
      )}
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

      {summary.sections.map((section) => (
        <ExpandableSummarySection key={section.key} section={section} needsClarification={needsClarification} />
      ))}

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
