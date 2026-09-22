import { useState, useEffect, useRef } from "react";
import { BOARD_TEMPLATE_OPTIONS, type BoardTemplateId } from "../lib/boardTemplates.js";

interface NewBoardModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, templateId: BoardTemplateId) => void;
}

export default function NewBoardModal({ open, onClose, onCreate }: NewBoardModalProps) {
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<BoardTemplateId>("blank");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setTemplateId("blank");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

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
    onCreate(name.trim() || "Untitled Board", templateId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Create New Board</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">
              Board Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Startup Pitch Deck, Meal Planner App..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-600 block mb-1.5">
              Template
            </legend>
            <div className="space-y-2">
              {BOARD_TEMPLATE_OPTIONS.map((template) => (
                <label
                  key={template.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2.5 hover:border-blue-300"
                >
                  <input
                    type="radio"
                    name="board-template"
                    value={template.id}
                    checked={templateId === template.id}
                    onChange={() => setTemplateId(template.id)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-700">{template.label}</span>
                    <span className="block text-xs text-slate-500">{template.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition shadow-sm"
            >
              Create Board
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
