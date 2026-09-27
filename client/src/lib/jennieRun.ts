import type { BoxData, SecurityClarification } from "../types.js";
import type { JennieRunStage } from "./boardTemplates.js";
import { jennieClarificationEntries } from "./boardTemplates.js";
import { upsertClarifications } from "./securityClarifications.js";

/** Attribution for everything the one-click run records on the board. */
export const JENNIE_RUN_ACTOR = "Demo run";

export interface JennieRunDeps {
  runBox: (id: string) => Promise<void>;
  getBoxData: (id: string) => BoxData | undefined;
  setSecurityClarifications: (id: string, entries: SecurityClarification[]) => void;
  proceedWithUnresolvedClarifications: (id: string, actor?: string) => boolean;
  /** False once the user has switched boards; the run then stops silently. */
  isCurrent: () => boolean;
  progress: (message: string) => void;
  now?: () => number;
}

function stopReason(result: BoxData | undefined): string | null {
  if (result?.status !== "done" || !result.output?.trim()
    || result.securityArtifactValidation?.status === "invalid") {
    return result?.error || "Please review this box's output before continuing.";
  }
  return null;
}

/**
 * Runs the Jennie showcase stages in order. When the Requirements Elicitor asks
 * for clarification, it is answered once with the fixed scripted demo answers
 * and rerun; if it still needs clarification, the run proceeds past it with a
 * visibly recorded "Demo run" override so the NIST CSF Gap Checker can run.
 */
export async function runJennieStages(plan: readonly JennieRunStage[], deps: JennieRunDeps): Promise<void> {
  const now = deps.now ?? Date.now;
  for (const [index, stage] of plan.entries()) {
    if (!deps.isCurrent()) return;
    deps.progress(`Running ${index + 1}/${plan.length}: ${stage.title}`);
    await deps.runBox(stage.id);
    if (!deps.isCurrent()) return;
    let result = deps.getBoxData(stage.id);
    let reason = stopReason(result);
    if (reason) {
      deps.progress(`Stopped at ${stage.title}: ${reason}`);
      return;
    }

    if (stage.type === "reqelicitor" && result?.securityArtifactValidation?.status === "clarification_required") {
      deps.progress(`Answering ${stage.title}'s questions with the scripted demo answers…`);
      deps.setSecurityClarifications(
        stage.id,
        upsertClarifications(result.securityClarifications, jennieClarificationEntries(JENNIE_RUN_ACTOR, now())),
      );
      await deps.runBox(stage.id);
      if (!deps.isCurrent()) return;
      result = deps.getBoxData(stage.id);
      reason = stopReason(result);
      if (reason) {
        deps.progress(`Stopped at ${stage.title}: ${reason}`);
        return;
      }
      if (result?.securityArtifactValidation?.status === "clarification_required") {
        deps.proceedWithUnresolvedClarifications(stage.id, JENNIE_RUN_ACTOR);
      }
    }
  }
  deps.progress("Review generated. Check each result before using it.");
}
