import { describe, expect, it, vi } from "vitest";
import type { BoxData, SecurityArtifactValidationStatus, SecurityClarification } from "../types.js";
import type { JennieRunStage } from "./boardTemplates.js";
import { JENNIE_CLARIFICATIONS } from "./boardTemplates.js";
import { JENNIE_RUN_ACTOR, runJennieStages } from "./jennieRun.js";

const plan: JennieRunStage[] = [
  { id: "am", title: "Asset Mapper", type: "assetmapper" },
  { id: "re", title: "Security Requirements Elicitor", type: "reqelicitor" },
  { id: "nist", title: "NIST CSF Gap Checker", type: "nistgap" },
];

function box(status: SecurityArtifactValidationStatus, extra: Partial<BoxData> = {}): BoxData {
  return {
    content: "", prompt: "", systemPrompt: "", output: "artifact", status: "done",
    securityArtifactValidation: {
      status, artifactType: "", schemaVersion: "1.0", issues: [], validatedAt: 1, trustedMetadata: { assessmentDate: "" },
    },
    ...extra,
  };
}

/** `results[id]` lists the box state after each successive run of that box. */
function harness(results: Record<string, BoxData[]>) {
  const runs: string[] = [];
  const state: Record<string, BoxData> = {};
  const clarifications: Record<string, SecurityClarification[]> = {};
  const progress: string[] = [];
  const deps = {
    runBox: vi.fn(async (id: string) => {
      runs.push(id);
      const count = runs.filter((entry) => entry === id).length;
      state[id] = { ...results[id][Math.min(count, results[id].length) - 1], securityClarifications: clarifications[id] };
    }),
    getBoxData: (id: string) => state[id],
    setSecurityClarifications: vi.fn((id: string, entries: SecurityClarification[]) => { clarifications[id] = entries; }),
    proceedWithUnresolvedClarifications: vi.fn(() => true),
    isCurrent: () => true,
    progress: (message: string) => progress.push(message),
    now: () => 77,
  };
  return { deps, runs, progress, clarifications };
}

describe("runJennieStages", () => {
  it("answers the Elicitor with scripted answers, reruns once, and continues when resolved", async () => {
    const { deps, runs, progress, clarifications } = harness({
      am: [box("clarification_required")],
      re: [box("clarification_required"), box("valid")],
      nist: [box("valid")],
    });
    await runJennieStages(plan, deps);
    expect(runs).toEqual(["am", "re", "re", "nist"]);
    expect(clarifications.re).toHaveLength(JENNIE_CLARIFICATIONS.length);
    expect(clarifications.re.every((entry) => entry.source === "demo-script" && entry.answeredBy === JENNIE_RUN_ACTOR)).toBe(true);
    expect(deps.proceedWithUnresolvedClarifications).not.toHaveBeenCalled();
    expect(progress).toContain("Answering Security Requirements Elicitor's questions with the scripted demo answers…");
    expect(progress.at(-1)).toBe("Review generated. Check each result before using it.");
  });

  it("auto-proceeds with a recorded Demo run override when still unresolved", async () => {
    const { deps, runs } = harness({
      am: [box("valid")],
      re: [box("clarification_required"), box("clarification_required")],
      nist: [box("valid")],
    });
    await runJennieStages(plan, deps);
    expect(runs).toEqual(["am", "re", "re", "nist"]);
    expect(deps.proceedWithUnresolvedClarifications).toHaveBeenCalledWith("re", JENNIE_RUN_ACTOR);
  });

  it("skips the scripted round when the Elicitor is already complete", async () => {
    const { deps, runs } = harness({ am: [box("valid")], re: [box("valid")], nist: [box("valid")] });
    await runJennieStages(plan, deps);
    expect(runs).toEqual(["am", "re", "nist"]);
    expect(deps.setSecurityClarifications).not.toHaveBeenCalled();
  });

  it("still stops on a failed rerun or a blocked downstream box", async () => {
    const failed = harness({
      am: [box("valid")],
      re: [box("clarification_required"), box("valid", { status: "error", error: "Model offline" })],
      nist: [box("valid")],
    });
    await runJennieStages(plan, failed.deps);
    expect(failed.runs).toEqual(["am", "re", "re"]);
    expect(failed.progress.at(-1)).toBe("Stopped at Security Requirements Elicitor: Model offline");

    const blocked = harness({
      am: [box("valid")],
      re: [box("valid")],
      nist: [box("valid", { status: "error", error: "Gate message" })],
    });
    await runJennieStages(plan, blocked.deps);
    expect(blocked.progress.at(-1)).toBe("Stopped at NIST CSF Gap Checker: Gate message");
  });
});
