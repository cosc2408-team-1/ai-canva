// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generate = vi.hoisted(() => vi.fn());
vi.mock("../lib/api.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api.js")>()),
  generate,
}));

import { useBoardStore } from "./boardStore.js";
import { clarificationKey } from "../lib/securityClarifications.js";
import { validateSecurityArtifact } from "../lib/securityArtifacts.js";
import { BOX_TYPES, NIST_STATUS_OUTPUT_RULE, SECURITY_WORKER_YAML_RULE } from "../types.js";
import { GENERATION_TIMEOUT_MS } from "../lib/api.js";
import { jennieSampleOutputs } from "../lib/jennieSample.js";

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

function setupAdvisor(systemPrompt?: string) {
  const { elicitor } = setupBoard();
  const store = useBoardStore.getState();
  const { parsed: _parsed, ...validation } = validateSecurityArtifact({ boxType: "reqelicitor", output: unresolvedPackage });
  store.updateBoxData(elicitor, { output: unresolvedPackage, securityArtifactValidation: validation });
  const advisor = store.addBox("securityadvisor");
  if (systemPrompt !== undefined) store.updateBoxData(advisor, { systemPrompt });
  useBoardStore.setState({ edges: [{ id: "to-advisor", source: elicitor, target: advisor }] });
  generate.mockResolvedValue(reply('artifact_type: NextStepGuidance\nschema_version: "1.0"\nstatus: interview_required\nfocused_questions: [What evidence can be reviewed?]'));
  return { advisor, elicitor };
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

describe("Advisor runtime reference contract", () => {
  it("hardens a legacy stored prompt without changing it or rerunning upstream", async () => {
    const legacyPrompt = "Legacy Advisor instructions: preserve supplied evidence.";
    const { advisor, elicitor } = setupAdvisor(legacyPrompt);
    const upstreamBefore = structuredClone(useBoardStore.getState().boxData[elicitor]);

    await useBoardStore.getState().runBox(advisor);

    expect(generate).toHaveBeenCalledTimes(1);
    const request = generate.mock.calls[0][0];
    expect(request.systemPrompt).toContain(legacyPrompt);
    expect(request.systemPrompt).toContain("relevant_upstream_references must be a YAML list of bare upstream ID strings");
    expect(request.userPrompt).toContain(unresolvedPackage);
    expect(useBoardStore.getState().boxData[advisor].systemPrompt).toBe(legacyPrompt);
    expect(useBoardStore.getState().boxData[elicitor]).toEqual(upstreamBefore);
    expect(useBoardStore.getState().boxData[advisor].securityArtifactValidation?.status).toBe("clarification_required");
  });

  it("does not duplicate the contract on new Advisor boxes or subsequent runs", async () => {
    const { advisor } = setupAdvisor();
    await useBoardStore.getState().runBox(advisor);
    await useBoardStore.getState().runBox(advisor);

    expect(generate).toHaveBeenCalledTimes(2);
    for (const [request] of generate.mock.calls) {
      expect(request.systemPrompt).toBe(BOX_TYPES.securityadvisor.defaultSystemPrompt);
      expect(request.systemPrompt.split("relevant_upstream_references must be a YAML list of bare upstream ID strings")).toHaveLength(2);
    }
  });

  it("leaves other workers' system prompts unchanged", async () => {
    const store = useBoardStore.getState();
    const idea = store.addBox("idea");
    const research = store.addBox("research");
    store.updateBoxData(idea, { content: "A synthetic project." });
    store.updateBoxData(research, { systemPrompt: "Research only." });
    useBoardStore.setState({ edges: [{ id: "research-input", source: idea, target: research }] });
    generate.mockResolvedValue(reply("Synthetic research output."));

    await useBoardStore.getState().runBox(research);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][0].systemPrompt).toBe("Research only.");
  });
});

describe("legacy Team 2 worker requests", () => {
  it("runs Threat Modeler, Risk Scorer and IR Planner through current contracts without rerunning upstream", async () => {
    const store = useBoardStore.getState();
    const sample = jennieSampleOutputs("2026-10-22");
    const asset = store.addBox("assetmapper");
    const { parsed: _parsed, ...validation } = validateSecurityArtifact({ boxType: "assetmapper", output: sample.assetmapper });
    store.updateBoxData(asset, { status: "done", output: sample.assetmapper, securityArtifactValidation: validation });
    const upstreamBefore = structuredClone(useBoardStore.getState().boxData[asset]);
    let source = asset;
    for (const type of ["threatModeler", "riskScorer", "irPlanner"] as const) {
      const id = store.addBox(type);
      const legacy = "Legacy Markdown report instructions.";
      store.updateBoxData(id, { systemPrompt: legacy, prompt: "Review the connected evidence:\n{{inputs}}" });
      const edges = useBoardStore.getState().edges;
      useBoardStore.setState({ edges: [...edges, { id: `to-${type}`, source, target: id }] });
      generate.mockResolvedValueOnce(reply(sample[type]));
      await store.runBox(id);
      const request = generate.mock.calls.at(-1)![0];
      expect(request.systemPrompt).toContain(SECURITY_WORKER_YAML_RULE);
      expect(request.systemPrompt).toContain("artifact_type:");
      expect(request.userPrompt).toContain(useBoardStore.getState().boxData[source].output.trim());
      expect(useBoardStore.getState().boxData[id].systemPrompt).toBe(legacy);
      expect(useBoardStore.getState().boxData[id].securityArtifactValidation?.status).not.toBe("invalid");
      source = id;
    }
    expect(generate).toHaveBeenCalledTimes(3);
    expect(useBoardStore.getState().boxData[asset]).toEqual(upstreamBefore);
  });

  it.each(["riskScorer", "irPlanner"] as const)("blocks %s when its upstream artifact is invalid without retrying", async (type) => {
    const store = useBoardStore.getState();
    const upstreamType = type === "riskScorer" ? "threatModeler" : "riskScorer";
    const source = store.addBox(upstreamType);
    store.updateBoxData(source, { status: "done", output: "broken: value: colon" });
    const target = store.addBox(type);
    useBoardStore.setState({ edges: [{ id: "invalid-upstream", source, target }] });
    await store.runBox(target);
    expect(generate).not.toHaveBeenCalled();
    expect(useBoardStore.getState().boxData[target].status).toBe("error");
    expect(useBoardStore.getState().boxData[target].error).toContain("invalid structured artifact");
  });
});

describe("IR legacy formatting with clarification answers", () => {
  it("passes answers unchanged but finishes the request with the canonical YAML contract", async () => {
    const store = useBoardStore.getState();
    const sample = jennieSampleOutputs("2026-10-22");
    const risk = store.addBox("riskScorer");
    store.updateBoxData(risk, { status: "done", output: sample.riskScorer });
    const ir = store.addBox("irPlanner");
    const legacy = "Write each phase as a ## heading with **Known facts** and bullet lists.\n{{inputs}}";
    store.updateBoxData(ir, { prompt: legacy, systemPrompt: "Legacy IR reporting instructions." });
    store.setSecurityClarifications(ir, [{ key: clarificationKey("Who approves containment?"), question: "Who approves containment?", whyItMatters: "", answer: "The owner reportedly approves; no policy record supplied.", answeredBy: "Demo reviewer", answeredAt: 1, round: 1, source: "user" }]);
    const original = structuredClone(useBoardStore.getState().boxData[ir].securityClarifications);
    useBoardStore.setState({ edges: [{ id: "risk-ir", source: risk, target: ir }] });
    generate.mockResolvedValueOnce(reply(sample.irPlanner));
    await store.runBox(ir);
    expect(generate).toHaveBeenCalledTimes(1);
    const request = generate.mock.calls[0][0];
    expect(request.userPrompt).toContain("The owner reportedly approves; no policy record supplied.");
    expect(request.userPrompt).toContain("Final IR output instructions");
    expect(request.userPrompt).toContain("artifact_type: IncidentResponsePlan");
    expect(request.userPrompt.indexOf("Final IR output instructions")).toBeGreaterThan(request.userPrompt.indexOf("## heading"));
    expect(useBoardStore.getState().boxData[ir].prompt).toBe(legacy);
    expect(useBoardStore.getState().boxData[ir].securityClarifications).toEqual(original);
    expect(useBoardStore.getState().boxData[ir].securityArtifactValidation?.status).toBe("valid");
  });
});

describe("security generation recovery", () => {
  function setupNist() {
    const { elicitor, nist } = setupBoard();
    const sample = jennieSampleOutputs("2026-10-22");
    useBoardStore.getState().updateBoxData(elicitor, { output: sample.reqelicitor, status: "done" });
    const { parsed: _parsed, ...validation } = validateSecurityArtifact({
      boxType: "nistgap", output: sample.nistgap, trustedMetadata: { assessmentDate: "2026-10-22" },
    });
    useBoardStore.getState().updateBoxData(nist, {
      output: sample.nistgap, systemPrompt: "Legacy NIST prompt.", securityArtifactValidation: validation,
    });
    return { nist, sample, validation };
  }

  it("preserves the previous output and trusted date during a failed NIST rerun", async () => {
    const { nist, sample, validation } = setupNist();
    let resolve!: (value: ReturnType<typeof reply>) => void;
    generate.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const pending = useBoardStore.getState().runBox(nist);
    expect(generate.mock.calls[0][0].systemPrompt).toContain(NIST_STATUS_OUTPUT_RULE);
    expect(useBoardStore.getState().boxData[nist].securityArtifactValidation).toEqual(validation);
    await vi.advanceTimersByTimeAsync(GENERATION_TIMEOUT_MS);
    expect(useBoardStore.getState().boxData[nist].status).toBe("error");
    expect(useBoardStore.getState().boxData[nist].output).toBe(sample.nistgap);
    expect(useBoardStore.getState().boxData[nist].securityArtifactValidation).toEqual(validation);
    resolve(reply("Late obsolete response"));
    await pending;
    expect(useBoardStore.getState().boxData[nist].output).toBe(sample.nistgap);
  });

  it("recovers an expired restored lease without ending a live collaborator's lease early", async () => {
    const { nist } = setupNist();
    useBoardStore.getState().updateBoxData(nist, {
      status: "running", generationRun: { id: "remote-run", deadlineAt: Date.now() + GENERATION_TIMEOUT_MS },
    });
    await vi.advanceTimersByTimeAsync(GENERATION_TIMEOUT_MS - 1);
    expect(useBoardStore.getState().boxData[nist].status).toBe("running");
    await vi.advanceTimersByTimeAsync(1);
    expect(useBoardStore.getState().boxData[nist].status).toBe("error");
    expect(generate).not.toHaveBeenCalled();
  });

  it("does not reset a legacy remote run whose deadline is unknown", async () => {
    const { nist } = setupNist();
    useBoardStore.getState().updateBoxData(nist, { status: "running" });
    await vi.advanceTimersByTimeAsync(GENERATION_TIMEOUT_MS);
    expect(useBoardStore.getState().boxData[nist].status).toBe("running");
  });

  it("does not let a late obsolete response overwrite a newer successful run", async () => {
    const { nist, sample } = setupNist();
    let resolve!: (value: ReturnType<typeof reply>) => void;
    generate.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const pending = useBoardStore.getState().runBox(nist);
    await vi.advanceTimersByTimeAsync(GENERATION_TIMEOUT_MS);
    const fresh = sample.nistgap + "\n# Fresh result\n";
    generate.mockResolvedValueOnce(reply(fresh));
    await useBoardStore.getState().runBox(nist);
    resolve(reply("Late obsolete response"));
    await pending;
    expect(useBoardStore.getState().boxData[nist].output).toBe(fresh);
    expect(useBoardStore.getState().boxData[nist].status).toBe("done");
    expect(useBoardStore.getState().boxData[nist].securityArtifactValidation?.trustedMetadata.assessmentDate).toBeTruthy();
  });

  it.each(["running", "error"] as const)("blocks downstream calls while the upstream status is %s", async (status) => {
    const { advisor, elicitor } = setupAdvisor();
    useBoardStore.getState().updateBoxData(elicitor, { status });
    await useBoardStore.getState().runBox(advisor);
    expect(generate).not.toHaveBeenCalled();
    expect(useBoardStore.getState().boxData[advisor].status).toBe("error");
  });
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
