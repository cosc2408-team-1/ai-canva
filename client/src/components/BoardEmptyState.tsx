import { securityWorkflowStages } from "../lib/securityWorkflow.js";

interface BoardEmptyStateProps {
  visible: boolean;
  sidebarOpen: boolean;
  onCreateSecurityAssessment: () => void;
  onBrowseTemplates: () => void;
  onBuildManually: () => void;
}

const STAGES = securityWorkflowStages();

export default function BoardEmptyState({
  visible,
  sidebarOpen,
  onCreateSecurityAssessment,
  onBrowseTemplates,
  onBuildManually,
}: BoardEmptyStateProps) {
  if (!visible) return null;

  return (
    <div
      className={
        "pointer-events-none absolute inset-y-0 left-0 z-[6] items-center justify-center px-4 py-6 sm:px-8 " +
        (sidebarOpen ? "right-[232px] hidden sm:flex" : "right-0 flex")
      }
    >
      <section className="pointer-events-auto w-full max-w-2xl" aria-labelledby="start-workflow-title">
        <div className="mb-5 text-center">
          <p className="text-xs font-semibold uppercase text-teal-700">Get started</p>
          <h2 id="start-workflow-title" className="mt-1 text-2xl font-semibold text-slate-900">
            Start a workflow
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose a ready-made workflow or build your own.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="h-1 bg-gradient-to-r from-teal-500 via-sky-500 to-indigo-500" />
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 text-xl"
              >
                🔐
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">Security Assessment</h3>
                  <span className="rounded bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                    Featured
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Turn a project description into assets, security requirements, a preliminary NIST assessment and clear next steps.
                </p>
              </div>
            </div>

            <ol className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-200 pt-4 sm:grid-cols-4" aria-label="Security Assessment stages">
              {STAGES.map((stage) => (
                <li key={stage.id} className="px-1">
                  <span className="block text-[11px] font-semibold text-teal-700">
                    {String(stage.order).padStart(2, "0")}
                  </span>
                  <span className="block text-[13px] font-semibold text-slate-800">{stage.shortLabel}</span>
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={onCreateSecurityAssessment}
              className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:w-auto"
            >
              Create Security Assessment
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <button
            type="button"
            onClick={onBrowseTemplates}
            className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Browse templates
          </button>
          <button
            type="button"
            onClick={onBuildManually}
            className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Build manually
          </button>
        </div>
      </section>
    </div>
  );
}
