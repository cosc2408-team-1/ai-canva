import type { SecurityArtifactValidation, SecurityArtifactValidationStatus } from "../types.js";

export function securityArtifactStatusPresentation(status: SecurityArtifactValidationStatus) {
  return {
    valid: { label: "Valid", description: "Format & references checked", icon: "✓", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    warning: { label: "Warning", description: "Usable artifact with validation warnings", icon: "⚠", className: "border-amber-200 bg-amber-50 text-amber-700" },
    invalid: { label: "Invalid", description: "Artifact integrity check failed", icon: "✕", className: "border-rose-200 bg-rose-50 text-rose-700" },
    clarification_required: { label: "Needs clarification", description: "More project evidence or clarification is needed", icon: "?", className: "border-violet-200 bg-violet-50 text-violet-700" },
  }[status];
}

/** Format/integrity signal only; it does not indicate security approval or compliance. */
export default function SecurityArtifactStatus({ validation, hasOutput = false }: { validation?: SecurityArtifactValidation; hasOutput?: boolean }) {
  if (!validation && !hasOutput) return null;
  const presentation = validation ? securityArtifactStatusPresentation(validation.status) : undefined;
  const visible = validation?.issues.slice(0, 3) ?? [];
  const remaining = (validation?.issues.length ?? 0) - visible.length;
  return (
    <section className={`mx-3 mb-2 rounded-md border px-2.5 py-2 text-xs ${presentation?.className ?? "border-slate-200 bg-slate-50 text-slate-700"}`} aria-label="Security artifact review status">
      {presentation && <div className="flex items-center gap-1 font-semibold">
        <span aria-hidden="true">{presentation.icon}</span>
        <span>{presentation.label}</span>
        <span className="font-normal">· {presentation.description}</span>
      </div>}
      {!validation && hasOutput && <p className="font-medium">Validation status is not available for this saved result.</p>}
      {visible.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-4 font-normal" title={(validation?.issues ?? []).map((entry) => entry.message).join("\n")}>
          {visible.map((entry, index) => <li key={`${entry.code}-${entry.path}-${index}`}>{entry.message}</li>)}
          {remaining > 0 && <li>+ {remaining} more issues</li>}
        </ul>
      )}
    </section>
  );
}
