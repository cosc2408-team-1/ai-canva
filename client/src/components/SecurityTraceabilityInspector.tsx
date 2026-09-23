import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  traceEntity,
  type SecurityTraceGraph,
} from "../lib/securityTraceability.js";
import { deriveMicrosoftSecurityLens } from "../lib/microsoftSecurityLens.js";
import {
  traceabilityGroups,
  traceRelationshipLabel,
} from "../lib/securityTraceabilityPresentation.js";

type InspectorView = "traceability" | "microsoft-security-lens";
const INSPECTOR_VIEWS: InspectorView[] = ["traceability", "microsoft-security-lens"];

export default function SecurityTraceabilityInspector({
  graph,
  selectedEntityId,
  onSelectEntity,
  onClose,
}: {
  graph: SecurityTraceGraph;
  selectedEntityId: string;
  onSelectEntity: (id: string) => void;
  onClose: () => void;
}) {
  const entity = traceEntity(graph, selectedEntityId);
  const groups = traceabilityGroups(graph, selectedEntityId);
  const lens = deriveMicrosoftSecurityLens(graph, selectedEntityId);
  const [activeView, setActiveView] = useState<InspectorView>("traceability");
  const tabRefs = useRef<Record<InspectorView, HTMLButtonElement | null>>({
    traceability: null,
    "microsoft-security-lens": null,
  });

  const activateView = (view: InspectorView) => {
    setActiveView(view);
    tabRefs.current[view]?.focus();
  };

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = INSPECTOR_VIEWS.indexOf(activeView);
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % INSPECTOR_VIEWS.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex + INSPECTOR_VIEWS.length - 1) % INSPECTOR_VIEWS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = INSPECTOR_VIEWS.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    activateView(INSPECTOR_VIEWS[nextIndex]);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!entity) return null;

  return (
    <aside
      aria-label="Traceability inspector"
      data-testid="traceability-inspector"
      className="nodrag nowheel absolute right-3 top-3 z-30 flex max-h-[min(70vh,36rem)] w-80 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-md border border-slate-300 bg-white shadow-xl"
    >
      <header className="flex shrink-0 flex-col gap-2 border-b border-slate-200 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Security context</h2>
          <button
            type="button"
            aria-label="Close traceability inspector"
            title="Close traceability"
            onClick={onClose}
            className="min-h-9 rounded px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Close
          </button>
        </div>
        <div role="tablist" aria-label="Inspector view" className="grid grid-cols-2 rounded border border-slate-200 p-0.5">
          {INSPECTOR_VIEWS.map((view) => {
            const selected = activeView === view;
            const label = view === "traceability" ? "Traceability" : "Microsoft Security Lens";
            return (
              <button
                key={view}
                ref={(node) => { tabRefs.current[view] = node; }}
                type="button"
                role="tab"
                id={`${view}-tab`}
                aria-selected={selected}
                aria-controls={`${view}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveView(view)}
                onKeyDown={onTabKeyDown}
                className={`min-h-8 truncate rounded px-1 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${selected ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </header>

      <div
        role="tabpanel"
        id="traceability-panel"
        aria-labelledby="traceability-tab"
        tabIndex={0}
        hidden={activeView !== "traceability"}
        className="min-h-0 overflow-y-auto p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
      >
        <code className="text-xs font-semibold text-teal-800">{entity.id}</code>
        {entity.label !== entity.id && <p className="mt-1 text-sm font-medium leading-relaxed text-slate-900">{entity.label}</p>}
        {entity.detail && <p className="mt-1 text-xs leading-relaxed text-slate-600">{entity.detail}</p>}

        {groups.length ? groups.map((group) => (
          <section key={group.kind} aria-label={group.heading} className="mt-3 border-t border-slate-200 pt-2.5">
            <h3 className="text-xs font-semibold text-slate-800">{group.heading}</h3>
            <ul className="mt-1.5 space-y-2">
              {group.entities.map((related) => (
                <li key={related.id} className="min-w-0">
                  <button
                    type="button"
                    aria-label={`Trace ${related.id}: ${related.label}`}
                    onClick={() => onSelectEntity(related.id)}
                    className="rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <span className="font-mono text-xs font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2">{related.id}</span>
                    {related.label !== related.id && <span className="ml-1 text-xs text-slate-800">{related.label}</span>}
                  </button>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                    {traceRelationshipLabel(graph, entity.id, related.id)}
                  </p>
                  {related.detail && <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{related.detail}</p>}
                </li>
              ))}
            </ul>
          </section>
        )) : (
          <p className="mt-3 border-t border-slate-200 pt-2.5 text-xs leading-relaxed text-slate-600">
            No explicitly linked entities were found for this item.
          </p>
        )}
      </div>
      <div
        role="tabpanel"
        id="microsoft-security-lens-panel"
        aria-labelledby="microsoft-security-lens-tab"
        tabIndex={0}
        hidden={activeView !== "microsoft-security-lens"}
        className="min-h-0 overflow-y-auto p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
      >
        <h3 className="text-xs font-semibold text-slate-900">Relevant Microsoft capabilities</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
          Selected item: <span className="font-mono font-medium text-teal-800">{entity.id}</span>
          {entity.label !== entity.id && <> · {entity.label}</>}
        </p>
        {lens.matches.length ? (
          <ul className="mt-2 space-y-2">
            {lens.matches.map(({ capability, matchedEvidence, rationale }) => (
              <li key={capability.id} className="rounded border border-slate-200 p-2.5">
                <h4 className="text-sm font-semibold text-slate-900">{capability.name}</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{capability.description}</p>
                <p className="mt-2 text-[11px] font-semibold text-slate-800">Matched because</p>
                <ul className="mt-1 space-y-1">
                  {matchedEvidence.map(({ sourceEntityId, signal }) => (
                    <li key={`${sourceEntityId}-${signal}`} className="text-[11px] leading-relaxed text-slate-600">
                      <span className="font-mono font-medium text-teal-800">{sourceEntityId}</span> · {signal}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{rationale}</p>
                <a
                  href={capability.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-8 items-center text-xs font-medium text-indigo-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  Learn more <span aria-hidden="true" className="ml-1">↗</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            No Microsoft capability mapping is shown for this item from the current trace evidence.
          </p>
        )}
        <p className="mt-3 border-t border-slate-200 pt-2.5 text-[11px] leading-relaxed text-slate-500">
          Capability mappings are implementation options derived from the current artifact context. They are not a compliance determination or Microsoft endorsement.
        </p>
      </div>
    </aside>
  );
}
