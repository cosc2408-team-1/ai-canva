import { useEffect } from "react";
import {
  traceEntity,
  type SecurityTraceGraph,
} from "../lib/securityTraceability.js";
import {
  traceabilityGroups,
  traceRelationshipLabel,
} from "../lib/securityTraceabilityPresentation.js";

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
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-3 py-2.5">
        <h2 className="text-sm font-semibold text-slate-900">Traceability</h2>
        <button
          type="button"
          aria-label="Close traceability inspector"
          title="Close traceability"
          onClick={onClose}
          className="min-h-9 rounded px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Close
        </button>
      </header>

      <div className="min-h-0 overflow-y-auto p-3">
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
    </aside>
  );
}
