import { describe, expect, it } from "vitest";
import { BOX_TYPES } from "./types.js";

describe("Asset Mapper box", () => {
  it("is a developer worker with an evidence-first AssetPackage contract", () => {
    const box = BOX_TYPES.assetmapper;

    expect(box).toMatchObject({
      label: "Asset Mapper",
      category: "worker",
      hasAI: true,
      roles: ["developer"],
    });
    for (const phrase of ["{{inputs}}", "AssetPackage", "AST-", "EVID-", "complete or clarification_required", "open_questions", "limitations"]) {
      expect(box.defaultPrompt).toContain(phrase);
    }
    for (const phrase of ["Do not invent assets", "risk scoring", "threat modelling", "NIST mapping", "compliance determination", "Output valid YAML only"]) {
      expect(box.defaultSystemPrompt).toContain(phrase);
    }
  });
});

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
    expect(box.defaultPrompt).toContain("AssetPackage");
    expect(box.defaultPrompt).toContain("preserve its case_id");
    expect(box.defaultPrompt).toContain("Do not renumber supplied AST-* IDs");
    expect(box.defaultPrompt).toContain("EVID-* IDs");
    expect(box.defaultPrompt).toContain("avoid duplicates");
    expect(box.defaultPrompt).toContain("When no AssetPackage is supplied");
    expect(box.defaultPrompt).toContain("direct-evidence mode");
    expect(box.defaultSystemPrompt).toContain("SQUARE-informed");
    for (const phrase of [
      "upstream AssetPackage or raw project evidence",
      "case_id, assessment_boundary, AST-* IDs, asset names, EVID-* IDs, and evidence_register entries",
      "Do not renumber supplied AST-* IDs or EVID-* IDs",
      "silently rewrite upstream evidence",
      "reference preserved upstream EVID-* IDs",
      "do not collide with existing upstream IDs",
      "When no AssetPackage is supplied, retain the direct raw-evidence mode",
      "unverified, user-reported evidence",
    ]) {
      expect(box.defaultSystemPrompt).toContain(phrase);
    }
    expect(box.defaultSystemPrompt).toContain("Output valid YAML only");
  });
});

describe("Security Advisor box", () => {
  it("is a worker that routes the practitioner without making assurance claims", () => {
    const box = BOX_TYPES.securityadvisor;

    expect(box).toMatchObject({
      label: "Security Advisor",
      category: "worker",
      hasAI: true,
      roles: ["developer"],
    });
    expect(box.defaultPrompt).toContain("{{inputs}}");
    expect(box.defaultPrompt).toContain("NextStepGuidance");
    expect(box.defaultPrompt).toContain("interview_required");
    expect(box.defaultSystemPrompt).toContain("recommended_next_box");
    expect(box.defaultSystemPrompt).toContain("Do not claim compliance");
    expect(box.defaultSystemPrompt).toContain("Output valid YAML only");
  });
});
