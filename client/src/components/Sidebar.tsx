import { useBoardStore } from "../store/boardStore.js";
import { BOX_TYPES, type BoxType } from "../types.js";
import { securityWorkflowStages } from "../lib/securityWorkflow.js";

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  isEmpty: boolean;
  emptyBoardMode: "onboarding" | "manual";
  onCreateSecurityAssessment: () => void;
  onBrowseTemplates: () => void;
  onBuildManually: () => void;
  onBackToGetStarted: () => void;
}

// Discovery only: older boards still load every original box type.
const SECTIONS: { title: string; types: BoxType[] }[] = [
  { title: "Project inputs", types: ["idea", "documents"] },
  { title: "Security review", types: ["assetmapper", "reqelicitor", "nistgap", "securityadvisor", "threatModeler", "riskScorer", "irPlanner"] },
  { title: "Team notes", types: ["note", "checklist"] },
];
const SECURITY_STAGES = securityWorkflowStages();

export default function Sidebar({ open, onToggle, isEmpty, emptyBoardMode, onCreateSecurityAssessment,
  onBrowseTemplates, onBuildManually, onBackToGetStarted }: SidebarProps) {
  const addBox = useBoardStore((s) => s.addBox);
  const showGetStarted = isEmpty && emptyBoardMode === "onboarding";
  return (
    <>
      {!open && (
        <button onClick={onToggle} className="sidebar-tab absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg rounded-l-xl w-8 h-16 flex items-center justify-center text-slate-400 hover:text-slate-700 border border-r-0 border-slate-200" title="Show panel">◀</button>
      )}
      <div className={`absolute right-0 top-0 bottom-0 z-20 bg-white shadow-xl border-l border-slate-200 transition-transform duration-300 flex flex-col ${open ? "translate-x-0" : "translate-x-full"}`} style={{ width: "248px" }} inert={!open}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <span className="text-[13px] font-semibold text-slate-700">{showGetStarted ? "Get Started" : "Add Box"}</span>
          <button onClick={onToggle} aria-label="Hide panel" className="text-slate-400 hover:text-slate-600 w-6 h-6 rounded hover:bg-slate-100" title="Hide panel">✕</button>
        </div>
        {showGetStarted ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <p className="text-[11px] leading-relaxed text-slate-500">Choose a workflow to begin.</p>
            <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
              <span aria-hidden="true" className="text-lg">🔐</span>
              <h3 className="mt-1 text-[13px] font-semibold text-slate-900">Security Assessment</h3>
              <p className="mt-2 text-[11px] font-medium leading-relaxed text-teal-800">{SECURITY_STAGES.map((stage) => stage.shortLabel).join(" → ")}</p>
              <button type="button" onClick={onCreateSecurityAssessment} className="mt-3 w-full min-h-9 rounded-lg bg-indigo-600 px-2 py-2 text-xs font-semibold text-white hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500">Create Security Assessment</button>
            </div>
            <button type="button" onClick={onBrowseTemplates} className="mt-4 block w-full min-h-9 rounded-lg border border-slate-200 px-2 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">Browse templates</button>
            <button type="button" onClick={onBuildManually} className="mt-2 block w-full min-h-9 rounded-lg px-2 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50">Build manually →</button>
          </div>
        ) : (
          <>
            {isEmpty && (
              <button type="button" onClick={onBackToGetStarted} className="mx-3 mt-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-indigo-700 hover:bg-indigo-50">← Back to Get Started</button>
            )}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-5">
              {SECTIONS.map((section) => (
                <section key={section.title}>
                  <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">{section.title}</h3>
                  <div className="space-y-1.5">
                    {section.types.map((type) => {
                      const meta = BOX_TYPES[type];
                      return (
                        <button key={type} onClick={() => addBox(type)} data-box-type={type}
                          className="palette-row w-full flex items-start gap-2.5 p-2 rounded-lg border border-slate-200/70 bg-white text-left transition hover:border-slate-300 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500" title={meta.description}>
                          <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-sm" style={{ backgroundColor: meta.color + "1F" }}>{meta.icon}</span>
                          <span className="flex-1 text-[13px] font-medium leading-snug text-slate-700 line-clamp-2 break-words">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
