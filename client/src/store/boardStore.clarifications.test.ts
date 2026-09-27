// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generate = vi.hoisted(() => vi.fn());
vi.mock("../lib/api.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api.js")>()),
  generate,
}));

import { useBoardStore } from "./boardStore.js";
import { clarificationKey } from "../lib/securityClarifications.js";

const unresolvedPackage = `artifact_type: RequirementsPackage
schema_version: "1.0"
case_id: CASE-001
status: clarification_required
assessment_boundary:
  included: [Web application]
  excluded: []
assets:
  - id: AST-001
    name: Student profiles
    evidence_refs: [EVID-001]
requirements:
  - id: REQ-001
    shall_statement: The system shall protect profiles.
    source_refs: [EVID-001]
evidence_register:
  - id: EVID-001
    source: Project Description
    statement: The platform stores user profiles.
assumptions: []
open_questions:
  - question: Is MFA enforced for administrators?
    why_it_matters: Decides whether privileged access is protected.
limitations: [Limited to supplied evidence.]`;

function reply(content: string) {
  return { content, model: "test", usage: undefined };
}

function setupBoard() {
  const store = useBoardStore.getState();
  const idea = store.addBox("idea");
  const elicitor = store.addBox("reqelicitor");
  const nist = store.addBox("nistgap");
  store.updateBoxData(idea, { content: "A student portal storing profiles.", output: "A student portal storing profiles." });
  useBoardStore.setState({
    edges: [
      { id: "e1", source: idea, target: elicitor },
      { id: "e2", source: elicitor, target: nist },
    ],
  });
  return { idea, elicitor, nist };
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  generate.mockReset();
  useBoardStore.setState({ nodes: [], edges: [], boxData: {}, currentBoardId: null });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  useBoardStore.setState({ nodes: [], edges: [], boxData: {}, currentBoardId: null });
});

describe("security clarifications in the store", () => {
  it("feeds saved answers to the asking box's next run", async () => {
    const { elicitor } = setupBoard();
    generate.mockResolvedValue(reply(unresolvedPackage));
    useBoardStore.getState().setSecurityClarifications(elicitor, [{
      key: clarificationKey("Is MFA enforced for administrators?"),
      question: "Is MFA enforced for administrators?",
      whyItMatters: "",
      answer: "Yes, via Conditional Access.",
      answeredBy: "Ana",
      answeredAt: 1,
      round: 1,
      source: "user",
    }]);

    await useBoardStore.getState().runBox(elicitor);

    const { userPrompt } = generate.mock.calls[0][0];
    expect(userPrompt).toContain("Clarification answers");
    expect(userPrompt).toContain("answer: Yes, via Conditional Access.");
    expect(userPrompt).toContain("A student portal storing profiles.");
  });

  it("skips the write when the answers are unchanged", () => {
    const { elicitor } = setupBoard();
    const entries = useBoardStore.getState().boxData[elicitor].securityClarifications || [];
    const before = useBoardStore.getState().boxData;
    useBoardStore.getState().setSecurityClarifications(elicitor, entries);
    expect(useBoardStore.getState().boxData).toBe(before);
  });

  it("blocks NIST without a model call until the user proceeds, then passes the bypass note", async () => {
    const { elicitor, nist } = setupBoard();
    generate.mockResolvedValueOnce(reply(unresolvedPackage));
    await useBoardStore.getState().runBox(elicitor);
    expect(useBoardStore.getState().boxData[elicitor].securityArtifactValidation?.status).toBe("clarification_required");

    generate.mockClear();
    await useBoardStore.getState().runBox(nist);
    expect(generate).not.toHaveBeenCalled();
    expect(useBoardStore.getState().boxData[nist].status).toBe("error");
    expect(useBoardStore.getState().boxData[nist].error).toContain("still has unanswered clarification questions");

    expect(useBoardStore.getState().proceedWithUnresolvedClarifications(elicitor, "Demo run")).toBe(true);
    expect(useBoardStore.getState().boxData[elicitor].securityClarificationOverride?.by).toBe("Demo run");
    generate.mockResolvedValueOnce(reply("not yaml"));
    await useBoardStore.getState().runBox(nist);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][0].userPrompt).toContain("The user chose to proceed although");
  });

  it("rerunning the upstream box voids its override", async () => {
    const { elicitor, nist } = setupBoard();
    generate.mockResolvedValue(reply(unresolvedPackage));
    await useBoardStore.getState().runBox(elicitor);
    useBoardStore.getState().proceedWithUnresolvedClarifications(elicitor);
    vi.advanceTimersByTime(5);
    await useBoardStore.getState().runBox(elicitor);
    expect(useBoardStore.getState().boxData[elicitor].securityClarificationOverride).toBeUndefined();

    generate.mockClear();
    await useBoardStore.getState().runBox(nist);
    expect(generate).not.toHaveBeenCalled();
  });

  it("refuses to proceed when the box does not need clarification", () => {
    const { elicitor } = setupBoard();
    expect(useBoardStore.getState().proceedWithUnresolvedClarifications(elicitor)).toBe(false);
  });
});
