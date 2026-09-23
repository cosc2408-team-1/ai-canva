import { useEffect } from "react";
import { useSecurityDemoStore, type SecurityDemoStep } from "../store/securityDemoStore.js";
import { Button } from "./ui/Button.js";

export function SecurityDemoAction({ available, boardId }: { available: boolean; boardId: string | null }) {
  const active = useSecurityDemoStore((state) => state.active);
  const start = useSecurityDemoStore((state) => state.start);
  if (!available) return null;
  if (active) {
    return <span className="inline-flex h-7 items-center rounded-md border border-indigo-200 bg-indigo-50 px-2.5 text-xs font-medium text-indigo-800">Demo in progress</span>;
  }

  return (
    <Button
      size="xs"
      variant="secondary"
      onClick={() => start(boardId)}
      title="Start the Security Assessment demo"
    >
      Start demo
    </Button>
  );
}

const STEP_CONTENT: Record<SecurityDemoStep, { title: string; body: string }> = {
  0: {
    title: "Start with project context",
    body: "Project Description leads into Asset Mapper, Security Requirements Elicitor, NIST CSF Gap Checker, and Security Advisor.",
  },
  1: {
    title: "Structured, reviewable artifacts",
    body: "Each stage keeps its exact YAML in Technical artifact and a readable Summary for people to review.",
  },
  2: {
    title: "Trace every security decision",
    body: "Stable IDs connect evidence, assets, requirements, findings, and guidance through the existing trace graph.",
  },
  3: {
    title: "Microsoft Security Lens",
    body: "The Lens maps immediate trace context to Microsoft capabilities and shows the signals behind each match.",
  },
};

export function SecurityDemoCoachmark({
  active,
  step,
  artifactOutputCount,
  hasTraceTarget,
  hasLensMatch,
  inspectorOpen,
  onFinish,
}: {
  active: boolean;
  step: SecurityDemoStep;
  artifactOutputCount: number;
  hasTraceTarget: boolean;
  hasLensMatch: boolean;
  inspectorOpen: boolean;
  onFinish: () => void;
}) {
  const next = useSecurityDemoStore((state) => state.next);
  const previous = useSecurityDemoStore((state) => state.previous);
  const content = STEP_CONTENT[step];
  const missingArtifactOutput = step === 1 && artifactOutputCount === 0;
  const missingTraceTarget = step === 2 && !hasTraceTarget;
  const fallback = step === 1
    ? missingArtifactOutput
      ? "Run the Security Assessment stages first. This tour will not generate content."
      : artifactOutputCount < 4
        ? "Some stages have no output yet. Continue with the artifacts already available."
        : null
    : step === 2
      ? missingTraceTarget
        ? "No traceable ID is available yet. A NIST finding is not required to use this step."
        : !inspectorOpen
          ? "The Inspector is closed or the selected item changed. Continue to choose a current trace target."
          : null
      : step === 3
        ? !hasTraceTarget
          ? "No current trace target is available. Return to the board and run the stages when ready."
          : !inspectorOpen
            ? "The Inspector is closed. Continue to reopen it on the current trace context."
            : !hasLensMatch
              ? "No Microsoft capability mapping is supported by this immediate context. The Lens prefers no match over a weak signal."
              : null
        : null;
  const actionLabel = step === 3 ? "Finish" : missingArtifactOutput || missingTraceTarget ? "Skip" : "Next";

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onFinish();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onFinish]);

  if (!active) return null;

  return (
    <section
      aria-label="Guided Security Assessment demo"
      aria-live="polite"
      aria-atomic="true"
      data-testid="security-demo-coachmark"
      className="shrink-0 border-b border-slate-200 bg-white px-4 py-3"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 sm:flex-row sm:gap-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-slate-500">
            <span>{step + 1} / 4</span>
            <span aria-hidden="true">·</span>
            <span>Guided demo</span>
          </div>
          <h2 className="mt-0.5 text-sm font-semibold text-slate-900">{content.title}</h2>
          <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-slate-600">{fallback || content.body}</p>
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-1.5 sm:w-auto">
          <Button size="xs" variant="ghost" onClick={onFinish} aria-label="Close guided demo">Close</Button>
          <Button size="xs" variant="secondary" disabled={step === 0} onClick={previous}>Previous</Button>
          <Button size="xs" variant="primary" onClick={step === 3 ? onFinish : next}>{actionLabel}</Button>
        </div>
      </div>
    </section>
  );
}
