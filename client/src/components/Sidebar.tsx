import { useState } from "react";
import { useBoardStore } from "../store/boardStore.js";
import { useUserBoxesStore } from "../store/userBoxesStore.js";
import { BOX_TYPES } from "../types.js";
import type { BoxType, BoxCategory } from "../types.js";
import { boxVisibleForRole, ROLE_LABELS, SIDEBAR_ROLES, sidebarRoleFromStored, type SidebarRole } from "../lib/boxRoles.js";
import { securityWorkflowStages, securityWorkflowStageNumber } from "../lib/securityWorkflow.js";
import SecurityWorkflowGuide from "./SecurityWorkflowGuide.js";
import CustomBoxModal from "./CustomBoxModal.js";

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

const SECTIONS: { title: string; category: BoxCategory }[] = [
  { title: "Inputs", category: "input" },
  // The gated SDLC pipeline (stages 1-6, in order). Kept next to Inputs because
  // an Idea box is the usual seed for stage 1.
  { title: "SDLC", category: "sdlc" },
  { title: "Workers", category: "worker" },
  { title: "Companions", category: "companion" },
  { title: "Collaboration", category: "collab" },
  { title: "Custom", category: "custom" },
];

/** Role filters shown as a dropdown at the top of the palette. */
const ROLE_STORAGE_KEY = "ai-canva:sidebar-role";
const SECURITY_STAGES = securityWorkflowStages();

/** The selectable role profiles (must stay in sync with the <option> list). */
export default function Sidebar({
  open,
  onToggle,
  isEmpty,
  emptyBoardMode,
  onCreateSecurityAssessment,
  onBrowseTemplates,
  onBuildManually,
  onBackToGetStarted,
}: SidebarProps) {
  const addBox = useBoardStore((s) => s.addBox);
  const addCustomBox = useBoardStore((s) => s.addCustomBox);
  const customDefs = useUserBoxesStore((s) => s.defs);
  const removeCustomDef = useUserBoxesStore((s) => s.remove);
  const [showCustomModal, setShowCustomModal] = useState(false);

  const [role, setRole] = useState<SidebarRole>(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(ROLE_STORAGE_KEY) : null;
    return sidebarRoleFromStored(stored);
  });

  const handleAdd = (type: BoxType) => {
    addBox(type);
  };

  const selectRole = (next: SidebarRole) => {
    setRole(next);
    if (typeof localStorage !== "undefined") {
      if (next === "all") localStorage.removeItem(ROLE_STORAGE_KEY);
      else localStorage.setItem(ROLE_STORAGE_KEY, next);
    }
  };

  const boxesByCategory = (cat: BoxCategory) =>
    (Object.entries(BOX_TYPES) as [BoxType, typeof BOX_TYPES[BoxType]][])
      .filter(([, meta]) => meta.category === cat && boxVisibleForRole(meta, role));
  const showGetStarted = isEmpty && emptyBoardMode === "onboarding";

  return (
    <>
      {/* Collapsed tab — shows when sidebar is hidden */}
      {!open && (
        <button
          onClick={onToggle}
          className="sidebar-tab absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg rounded-l-xl w-8 h-16 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition border border-r-0 border-slate-200"
          title="Show panel"
        >
          <span className="text-lg">◀</span>
        </button>
      )}

      {/* Sidebar panel */}
      <div
        className={
          "absolute right-0 top-0 bottom-0 z-20 bg-white shadow-xl border-l border-slate-200 " +
          "transition-transform duration-300 flex flex-col " +
          (open ? "translate-x-0" : "translate-x-full")
        }
        style={{ width: "232px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <span className="text-[13px] font-semibold text-slate-700">
            {showGetStarted ? "Get Started" : "Add Box"}
          </span>
          <button
            onClick={onToggle}
            aria-label="Hide panel"
            className="text-slate-400 hover:text-slate-600 transition w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100"
            title="Hide panel"
          >
            ✕
          </button>
        </div>

        {showGetStarted ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <p className="text-[11px] leading-relaxed text-slate-500">
              Choose a workflow to begin.
            </p>
            <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
              <span aria-hidden="true" className="text-lg">🔐</span>
              <h3 className="mt-1 text-[13px] font-semibold text-slate-900">
                Security Assessment
              </h3>
              <p className="mt-2 text-[11px] font-medium leading-relaxed text-teal-800">
                {SECURITY_STAGES.map((stage) => stage.shortLabel).join(" → ")}
              </p>
              <button
                type="button"
                onClick={onCreateSecurityAssessment}
                className="mt-3 w-full min-h-9 rounded-lg bg-indigo-600 px-2 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Create Security Assessment
              </button>
            </div>
            <button
              type="button"
              onClick={onBrowseTemplates}
              className="mt-4 block w-full min-h-9 rounded-lg border border-slate-200 px-2 py-2 text-left text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Browse templates
            </button>
            <button
              type="button"
              onClick={onBuildManually}
              className="mt-2 block w-full min-h-9 rounded-lg px-2 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Build manually →
            </button>
          </div>
        ) : (
          <>
        {isEmpty && emptyBoardMode === "manual" && (
          <button
            type="button"
            onClick={onBackToGetStarted}
            className="mx-3 mt-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            ← Back to Get Started
          </button>
        )}

        {/* Role filter */}
        <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/60 flex-shrink-0">
          <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <span>View</span>
          </label>
          <select
            value={role}
            onChange={(e) => selectRole(e.target.value as SidebarRole)}
            className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-[13px] font-medium text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
            title="Filter which boxes appear in the palette"
          >
            <option value="all">🧩 All boxes</option>
            {SIDEBAR_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        {/* Scrollable palette */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {role === "security" && <SecurityWorkflowGuide />}
          {SECTIONS.map((section) => {
            // The static "custom" meta is a runtime fallback, never a
            // palette item — the Custom section lists the user's saved
            // definitions instead.
            const boxes = boxesByCategory(section.category).filter(([t]) => t !== "custom");
            const isCustom = section.category === "custom";
            if (!isCustom && boxes.length === 0) return null;
            return (
              <div key={section.title}>
                <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {boxes.map(([type, meta]) => {
                    const stageNumber = role === "security" ? securityWorkflowStageNumber(type) : undefined;
                    return (
                      <button
                        key={type}
                        onClick={() => handleAdd(type)}
                        data-workflow-stage={stageNumber}
                        className="palette-row w-full flex items-start gap-2.5 pl-2 pr-2.5 py-1.5 rounded-lg border border-slate-200/70 bg-white text-left transition hover:border-slate-300 hover:shadow-sm"
                        title={meta.description}
                      >
                        {stageNumber ? (
                          <span
                            className="mt-1 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border border-teal-200 bg-teal-50 text-[10px] font-semibold text-teal-800"
                            aria-label={`Workflow step ${stageNumber}`}
                          >
                            {stageNumber}
                          </span>
                        ) : (
                          <span
                            className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-sm"
                            style={{ backgroundColor: meta.color + "1F" }}
                          >
                            {meta.icon}
                          </span>
                        )}
                        <span className={`flex-1 text-[13px] font-medium leading-snug text-slate-700 ${stageNumber ? "line-clamp-2 break-words" : "truncate"}`}>
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                  {isCustom && (
                    <>
                      {/* The user's saved custom box templates — click to add
                          an instance to the board; ✕ removes the template
                          (boxes already on boards are unaffected). */}
                      {customDefs.map((def) => (
                        <div key={def.id} className="relative group">
                          <button
                            onClick={() => addCustomBox(def)}
                            className="palette-row w-full flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-lg border border-slate-200/70 bg-white text-left transition hover:border-slate-300 hover:shadow-sm"
                            title={def.description || "Add this custom box"}
                          >
                            <span
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                              style={{ backgroundColor: def.color + "1F" }}
                            >
                              {def.icon}
                            </span>
                            <span className="flex-1 text-[13px] font-medium text-slate-700 truncate">
                              {def.label}
                            </span>
                          </button>
                          <button
                            onClick={() => removeCustomDef(def.id)}
                            className="touch-visible absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                            title="Delete this template (boards keep their copies)"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {customDefs.length === 0 && (
                        <p className="text-[11px] text-slate-400 px-1 leading-snug">
                          Create your own reusable AI boxes — saved to your profile.
                        </p>
                      )}
                      <button
                        onClick={() => setShowCustomModal(true)}
                        className="palette-row w-full flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/40 text-left transition hover:bg-indigo-50 hover:border-indigo-400"
                        title="Create a custom box"
                      >
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 bg-indigo-100/70">
                          ✨
                        </span>
                        <span className="flex-1 text-[13px] font-medium text-indigo-700 truncate">
                          New Custom Box
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
          </>
        )}
      </div>

      {/* Create Custom Box dialog */}
      {showCustomModal && <CustomBoxModal onClose={() => setShowCustomModal(false)} />}
    </>
  );
}
