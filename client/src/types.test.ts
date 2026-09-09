import { describe, expect, it } from "vitest";
import { BOX_TYPES } from "./types.js";

describe("NIST CSF Gap Checker box", () => {
  it("is a developer worker with an evidence-aware assessment prompt", () => {
    const box = BOX_TYPES.nistgap;

    expect(box).toMatchObject({
      label: "NIST CSF Gap Checker",
      category: "worker",
      hasAI: true,
      roles: ["developer"],
    });
    expect(box.defaultPrompt).toContain("{{inputs}}");
    expect(box.defaultPrompt).toContain("NISTAssessmentPackage");
    expect(box.defaultPrompt).toContain("clarification_required");
    expect(box.defaultSystemPrompt).toContain("not a compliance determination");
    expect(box.defaultSystemPrompt).toContain("Output valid YAML only");
  });
});

describe("Security Requirements Elicitor box", () => {
  it("is a developer worker that emits a traceable requirements package", () => {
    const box = BOX_TYPES.reqelicitor;

    expect(box).toMatchObject({
      label: "Security Requirements Elicitor",
      category: "worker",
      hasAI: true,
      roles: ["developer"],
    });
    expect(box.defaultPrompt).toContain("{{inputs}}");
    expect(box.defaultPrompt).toContain("RequirementsPackage");
    expect(box.defaultPrompt).toContain("clarification_required");
    expect(box.defaultSystemPrompt).toContain("SQUARE-informed");
    expect(box.defaultSystemPrompt).toContain("Output valid YAML only");
  });
});
