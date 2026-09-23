import { useState, useEffect, useRef } from "react";
import {
  BOARD_TEMPLATE_OPTIONS,
  DEFAULT_BOARD_TEMPLATE_ID,
  defaultBoardName,
  type BoardTemplateId,
} from "../lib/boardTemplates.js";
import { securityWorkflowStages } from "../lib/securityWorkflow.js";

interface NewBoardModalProps {
  open: boolean;
  initialTemplateId?: BoardTemplateId;
  onClose: () => void;
  onCreate: (name: string, templateId: BoardTemplateId) => void;
}

const SECURITY_STAGES = securityWorkflowStages();

export default function NewBoardModal({
  open,
  initialTemplateId = DEFAULT_BOARD_TEMPLATE_ID,
  onClose,
  onCreate,
}: NewBoardModalProps) {
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<BoardTemplateId>(initialTemplateId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setTemplateId(initialTemplateId);
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [open, initialTemplateId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(name.trim() || defaultBoardName(templateId), templateId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-board-title"
        className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sm:px-6">
          <div>
            <h2 id="new-board-title" className="text-lg font-semibold text-slate-900">New Board</h2>
            <p className="text-xs text-slate-500">Choose a workflow to start with.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close New Board"
            className="text-slate-400 hover:text-slate-600 transition w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5 sm:px-6">
          <fieldset>
            <legend className="text-sm font-medium text-slate-700 mb-2">Template</legend>
            <div className="space-y-2.5">
              {BOARD_TEMPLATE_OPTIONS.map((template) => (
                <label
                  key={template.id}
                  className={
                    "block cursor-pointer rounded-lg border-2 px-4 py-3 transition focus-within:ring-2 focus-within:ring-indigo-500/40 " +
                    (templateId === template.id
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-slate-200 bg-white hover:border-slate-300")
                  }
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="board-template"
                      value={template.id}
                      checked={templateId === template.id}
                      onChange={() => setTemplateId(template.id)}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 accent-indigo-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {template.id === "security-assessment" ? "🔐 " : ""}
                          {template.label}
                        </span>
                        {template.id === "security-assessment" && (
                          <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">
                            Featured
                          </span>
                        )}
                        {templateId === template.id && (
                          <span className="ml-auto text-xs font-medium text-indigo-700">Selected</span>
                        )}
                      </span>
                      {template.id === "security-assessment" ? (
                        <>
                          <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                            Turn a project description into assets, security requirements, a preliminary NIST assessment and clear next steps.
                          </span>
                          <span className="mt-2 flex flex-wrap gap-x-1 gap-y-0.5 text-[11px] font-medium text-teal-800">
                            {SECURITY_STAGES.map((stage, index) => (
                              <span key={stage.id}>
                                {index > 0 && <span aria-hidden="true" className="mr-1 text-slate-400">→</span>}
                                {stage.shortLabel}
                              </span>
                            ))}
                          </span>
                        </>
                      ) : (
                        <span className="mt-1 block text-xs text-slate-500">
                          Start from an empty canvas and add boxes manually.
                        </span>
                      )}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="new-board-name" className="text-sm font-medium text-slate-700 block mb-1.5">
              Board Name
            </label>
            <input
              id="new-board-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultBoardName(templateId)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {templateId === "security-assessment" ? "Create Security Assessment" : "Create Blank Board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
