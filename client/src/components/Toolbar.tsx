import { useState } from "react";
import { useBoardStore } from "../store/boardStore.js";
import { useSecurityDemoStore } from "../store/securityDemoStore.js";
import { BOX_TYPES } from "../types.js";
import { resolveQuickGuideContext, type QuickGuideContext } from "../lib/quickGuide.js";

interface GuideStep {
  action: string;
  detail: string;
}

interface GuideContent {
  title: string;
  steps: GuideStep[];
  footer: string;
}

const SECURITY_BOX_GUIDANCE: Record<Extract<QuickGuideContext, { kind: "security-box" }>["boxType"], { stage: string; detail: string }> = {
  assetmapper: { stage: "DISCOVER", detail: "Identify supported assets and their evidence." },
  reqelicitor: { stage: "SPECIFY", detail: "Turn supplied assets and evidence into testable requirements." },
  nistgap: { stage: "ASSESS", detail: "Compare requirements and evidence against relevant NIST CSF outcomes." },
  securityadvisor: { stage: "ADVISE", detail: "Review next actions, open questions, and human-review items." },
};

function guideContent(context: QuickGuideContext): GuideContent {
  switch (context.kind) {
    case "add-box":
      return {
        title: "Add a Box",
        steps: [
          { action: "Choose a box", detail: "Pick the task you want to perform." },
          { action: "Connect inputs", detail: "Link upstream boxes using the canvas handles." },
          { action: "Configure", detail: "Review the prompt or settings where needed." },
          { action: "Run when ready", detail: "Choose when to run an AI box." },
        ],
        footer: "Adding a box does not run AI.",
      };
    case "project-description":
      return {
        title: "Project Description",
        steps: [
          { action: "Describe the system", detail: "Add its purpose, users, data, architecture, and hosting context." },
          { action: "Keep it factual", detail: "This context informs downstream Security Assessment stages." },
        ],
        footer: "Include only information you can support.",
      };
    case "documents":
      return {
        title: "Documents",
        steps: [
          { action: "Add project evidence", detail: "Upload supported project documents." },
          { action: "Connect this box", detail: "Link Documents to an AI box that needs the evidence." },
          { action: "Run the downstream box", detail: "Extracted document text is included in its input." },
        ],
        footer: "Documents provide evidence; they do not run AI themselves.",
      };
    case "security-box": {
      const metadata = SECURITY_BOX_GUIDANCE[context.boxType];
      return {
        title: BOX_TYPES[context.boxType].label,
        steps: [
          { action: metadata.stage, detail: metadata.detail },
          { action: "Review the Summary", detail: "Use Technical artifact to inspect the exact YAML." },
        ],
        footer: context.boxType === "nistgap"
          ? "Preliminary analysis only; this does not determine compliance. Human review is required."
          : "AI assists the analysis; people make security and release decisions.",
      };
    }
    case "generic-box":
      return {
        title: context.label,
        steps: [
          { action: "Configure the box", detail: "Connect inputs and review its settings or prompt." },
          { action: "Run when ready", detail: context.boxType === "chatbot"
            ? "Send a message when you want the companion to respond."
            : BOX_TYPES[context.boxType].hasAI
              ? "Choose Run when you are ready to generate output."
              : "Edit the box content directly; this box does not run AI." },
        ],
        footer: context.boxType === "chatbot"
          ? "The companion responds only when you send a message."
          : BOX_TYPES[context.boxType].hasAI
            ? "AI boxes run only when you choose Run."
            : "This box does not run AI.",
      };
    case "security-workflow":
      return {
        title: "Security Assessment Guide",
        steps: [
          { action: "1. Start with Project Description", detail: "Add system purpose, users, data, and hosting context." },
          { action: "2. Run the workflow", detail: "Discover → Specify → Assess → Advise." },
          { action: "3. Review structured results", detail: "Use Summary for a quick review and Technical artifact for exact YAML." },
          { action: "4. Trace security decisions", detail: "Select a stable ID to open Traceability." },
          { action: "5. Explore Microsoft capabilities", detail: "Use Microsoft Security Lens to review relevant capabilities and match signals." },
        ],
        footer: "AI assists the analysis; people make security and compliance decisions.",
      };
    case "general-board":
      return {
        title: "General Board Guide",
        steps: [
          { action: "Add what you need", detail: "Choose a box from + Add Box." },
          { action: "Connect boxes", detail: "Drag between handles to pass inputs downstream." },
          { action: "Review before running", detail: "Check the content, prompt, and connected inputs." },
          { action: "Arrange the board", detail: "Move and resize boxes to make the workflow clear." },
        ],
        footer: "Boards auto-save when signed in.",
      };
    case "guided-demo":
      return { title: "Guided Demo", steps: [], footer: "" };
  }
}

export function QuickGuideContent({ context }: { context: QuickGuideContext }) {
  const content = guideContent(context);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{content.title}</h3>
      <ol className="space-y-2.5">
        {content.steps.map((step, index) => (
          <li key={`${index}-${step.action}`} className="text-xs leading-relaxed">
            <strong className="font-semibold text-slate-800">{step.action}</strong>
            <p className="text-slate-600">{step.detail}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] leading-relaxed text-slate-500">
        {content.footer}
      </p>
    </div>
  );
}

export default function Toolbar({ sidebarOpen = false }: { sidebarOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const nodes = useBoardStore((state) => state.nodes);
  const edges = useBoardStore((state) => state.edges);
  const demoActive = useSecurityDemoStore((state) => state.active);
  const context = resolveQuickGuideContext({ demoActive, sidebarOpen, nodes, edges });

  if (context.kind === "guided-demo") return null;

  return (
    <div className="help-anchor absolute bottom-4 left-4 z-10">
      {open ? (
        <section
          id="quick-guide-panel"
          aria-labelledby="quick-guide-title"
          className="w-[304px] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-900/10 backdrop-blur"
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
          <QuickGuideContent context={context} />
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
