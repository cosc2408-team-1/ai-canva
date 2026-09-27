// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

const generateMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/api.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api.js")>()),
  generate: generateMock,
}));

import { useBoardStore } from "./boardStore.js";
import { createBoardTemplate } from "../lib/boardTemplates.js";
import { findAsvsIds, isKnownAsvsId } from "../lib/asvsRetrieval.js";
import { BOX_TYPES, type BoxType } from "../types.js";

const PROJECT = "Students sign in with university Microsoft accounts and upload PDF or DOCX reports to their group. Administrators manage group membership.";

const ASSET_PACKAGE = `artifact_type: AssetPackage
schema_version: "1.0"
case_id: CASE-001
status: complete
assessment_boundary:
  included: [Student portal]
  excluded: []
assets:
  - id: AST-001
    name: Student reports
    evidence_refs: [EVID-001]
evidence_register:
  - id: EVID-001
    source: Project Description
    statement: Students upload PDF or DOCX reports to their group.
assumptions: []
open_questions: []
limitations: [Limited to supplied evidence.]`;

function loadSecurityAssessmentBoard() {
  let index = 0;
  const template = createBoardTemplate(
    "security-assessment",
    () => `box-${++index}`,
    (type: BoxType) => ({
      content: "",
      output: "",
      prompt: BOX_TYPES[type].defaultPrompt,
      systemPrompt: BOX_TYPES[type].defaultSystemPrompt,
      status: "idle",
    }),
  );
  const idFor = (type: BoxType) => template.nodes.find((node) => node.data.boxType === type)!.id;
  template.boxData[idFor("idea")].content = PROJECT;
  template.boxData[idFor("assetmapper")].output = ASSET_PACKAGE;
  useBoardStore.setState({ ...template, currentBoardId: null });
  return idFor;
}

beforeEach(() => {
  generateMock.mockReset();
  generateMock.mockResolvedValue({ content: "artifact_type: RequirementsPackage", model: "test" });
});

describe("Requirements Elicitor ASVS retrieval", () => {
  it("appends retrieved real ASVS 5.0.0 requirements to the Requirements Elicitor prompt", async () => {
    const idFor = loadSecurityAssessmentBoard();
    await useBoardStore.getState().runBox(idFor("reqelicitor"));

    expect(generateMock).toHaveBeenCalledTimes(1);
    const { userPrompt, systemPrompt } = generateMock.mock.calls[0][0];
    expect(systemPrompt).toBe(BOX_TYPES.reqelicitor.defaultSystemPrompt);
    expect(userPrompt).toContain(ASSET_PACKAGE.split("\n")[0]);
    expect(userPrompt).toContain("Retrieved OWASP ASVS 5.0.0 reference requirements");
    const ids = findAsvsIds(userPrompt);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every(isKnownAsvsId)).toBe(true);
  });

  it("does not add ASVS references to other boxes", async () => {
    const idFor = loadSecurityAssessmentBoard();
    await useBoardStore.getState().runBox(idFor("assetmapper"));

    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(generateMock.mock.calls[0][0].userPrompt).not.toContain("Retrieved OWASP ASVS");
  });
});
