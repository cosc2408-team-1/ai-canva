import { useState } from "react";
import type { Node } from "@xyflow/react";
import { useBoardStore } from "../store/boardStore.js";

const SECURITY_BOX_TYPES = ["assetmapper", "reqelicitor", "nistgap", "securityadvisor"];

export function isSecurityAssessmentWorkflow(nodes: Node[]): boolean {
  const types = new Set(nodes.map((node) => node.type));
  return SECURITY_BOX_TYPES.every((type) => types.has(type));
}

export function QuickGuideContent({ securityWorkflow }: { securityWorkflow: boolean }) {
  const steps = securityWorkflow
    ? [
        "Enter your project details in Project Description.",
        "Run each stage from left to right: Discover → Specify → Assess → Advise.",
        "Review each result status: Valid, Needs clarification, or Invalid.",
        "Add or clarify project information when requested, then rerun that stage.",
      ]
    : [
        "Use + Add Box to add what you need.",
        "Connect boxes by dragging from one box edge to another.",
        "Add your content, then click Run on AI boxes.",
        "Drag boxes to arrange them and resize when needed.",
      ];

  return (
    <>
      <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-slate-600">
        {steps.map((step) => <li key={step} className="pl-1">{step}</li>)}
      </ol>
      <p className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
        Boards auto-save when signed in.
      </p>
    </>
  );
}

/** Compact, context-aware canvas help. It is intentionally closed on first view. */
export default function Toolbar() {
  const [open, setOpen] = useState(false);
  const securityWorkflow = useBoardStore((state) => isSecurityAssessmentWorkflow(state.nodes));

  return (
    <div className="help-anchor absolute bottom-4 left-4 z-10">
      {open ? (
        <section
          id="quick-guide-panel"
          aria-labelledby="quick-guide-title"
          className="w-[272px] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-900/10 backdrop-blur"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="quick-guide-title" className="text-sm font-semibold text-slate-800">Quick Guide</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Quick Guide"
              className="flex h-9 w-9 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              ✕
            </button>
          </div>
          <QuickGuideContent securityWorkflow={securityWorkflow} />
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-controls="quick-guide-panel"
          aria-expanded={false}
          className="flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-md transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <span aria-hidden="true" className="font-semibold">?</span>
          Guide
        </button>
      )}
    </div>
  );
}
