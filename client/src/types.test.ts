import { describe, expect, it } from "vitest";
import { BOX_TYPES } from "./types.js";

describe("Asset Mapper box", () => {
  it("is a developer worker with an evidence-first AssetPackage contract", () => {
    const box = BOX_TYPES.assetmapper;

    expect(box).toMatchObject({
      label: "Asset Mapper",
      category: "worker",
      hasAI: true,
      roles: ["developer", "security"],
    });
    for (const phrase of ["{{inputs}}", "AssetPackage", "AST-", "EVID-", "complete or clarification_required", "open_questions", "limitations"]) {
      expect(box.defaultPrompt).toContain(phrase);
    }
    for (const phrase of ["Do not invent assets", "risk scoring", "threat modelling", "NIST mapping", "compliance determination", "Output valid YAML only"]) {
      expect(box.defaultSystemPrompt).toContain(phrase);
    }
    for (const phrase of ["one concise sentence", "Avoid repeating project narrative", "Preserve every required field, ID, and reference", "If open_questions is non-empty, use status: clarification_required", "if status is complete, open_questions must be []"]) {
      expect(box.defaultPrompt).toContain(phrase);
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
      roles: ["developer", "security"],
    });
    expect(box.defaultPrompt).toContain("{{inputs}}");
    expect(box.defaultPrompt).toContain("NISTAssessmentPackage");
    expect(box.defaultPrompt).toContain("artifact_type: NISTAssessmentPackage");
    expect(box.defaultPrompt).toContain('schema_version: "1.0"');
    expect(box.defaultPrompt).toContain("trusted application assessment_date metadata");
    expect(box.defaultPrompt).toContain("function_coverage must be a structured collection (an array or mapping)");
    for (const prompt of [box.defaultPrompt, box.defaultSystemPrompt]) {
      expect(prompt).toMatch(/requirements_package field MUST be a YAML mapping\/object/i);
      expect(prompt).toMatch(/copy every upstream RequirementsPackage field directly under requirements_package/i);
      expect(prompt).toMatch(/Do not serialize or stringify it/i);
      expect(prompt).toContain("Never emit requirements_package: | or requirements_package: >");
      expect(prompt).toMatch(/Do not add a Security Requirements Elicitor: wrapper label or Markdown fences/i);
    }
    for (const phrase of [
      'framework_version: "NIST CSF 2.0"',
      "Output block-style YAML only",
      "Never place an unquoted colon inside a plain scalar value",
      "Quote any YAML string containing a colon (:), hash (#)",
      "Do not use compact mappings or put multiple key/value pairs on one line",
      "structured fields for NIST Functions and outcomes",
      "Copy supplied trusted application assessment_date metadata exactly",
    ]) {
      expect(`${box.defaultPrompt}\n${box.defaultSystemPrompt}`).toContain(phrase);
    }
    expect(box.defaultPrompt).toContain("clarification_required");
    expect(box.defaultSystemPrompt).toContain("not a compliance determination");
    expect(box.defaultSystemPrompt).toContain("Output valid YAML only");
    for (const phrase of ["short structured function_coverage", "one concise sentence for each finding rationale", "Avoid repeating full upstream requirement text", "unchanged requirements_package"]) {
      expect(`${box.defaultPrompt}\n${box.defaultSystemPrompt}`).toContain(phrase);
    }
  });
});

describe("Security Requirements Elicitor box", () => {
  it("is a developer worker that emits a traceable requirements package", () => {
    const box = BOX_TYPES.reqelicitor;

    expect(box).toMatchObject({
      label: "Security Requirements Elicitor",
      category: "worker",
      hasAI: true,
      roles: ["developer", "security"],
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
    for (const phrase of ["one testable sentence", "acceptance_criteria short and testable", "Refer to upstream AST-* and EVID-* IDs", "If open_questions is non-empty, use status: clarification_required", "if status is complete, open_questions must be []"]) {
      expect(box.defaultPrompt).toContain(phrase);
    }
  });
});

describe("Security Advisor box", () => {
  it("is a worker that routes the practitioner without making assurance claims", () => {
    const box = BOX_TYPES.securityadvisor;

    expect(box).toMatchObject({
      label: "Security Advisor",
      category: "worker",
      hasAI: true,
      roles: ["developer", "security"],
    });
    expect(box.defaultPrompt).toContain("{{inputs}}");
    expect(box.defaultPrompt).toContain("NextStepGuidance");
    expect(box.defaultPrompt).toContain("artifact_type: NextStepGuidance");
    expect(box.defaultPrompt).toContain('schema_version: "1.0"');
    expect(box.defaultPrompt).toContain("interview_required");
    expect(box.defaultSystemPrompt).toContain("recommended_next_box");
    expect(box.defaultSystemPrompt).toContain("Do not claim compliance");
    for (const phrase of [
      'artifact_type: NextStepGuidance',
      'schema_version: "1.0"',
      "interview_required",
      "recommendation_ready",
      "focused_questions",
      "why_it_matters",
      "evidence_needed",
      "guidance_id",
      "recommended_next_box",
      "recommended_next_step",
      "relevant_upstream_references",
      "human_review",
      "assumptions",
      "limitations",
      "confidence",
      "Preserve their identifiers and meaning",
      "never delete, merge, downgrade, upgrade, rewrite",
      "Never infer implementation status or control effectiveness",
      "risk acceptance",
      "compliance, certification or security approval",
      "never create, connect, navigate to or run a box automatically",
    ]) {
      expect(box.defaultSystemPrompt).toContain(phrase);
    }
    expect(box.defaultSystemPrompt).toContain("Output valid YAML only");
  });

  it("defines numeric guidance IDs and list-shaped recommendation fields without changing interviews", () => {
    const { defaultPrompt, defaultSystemPrompt } = BOX_TYPES.securityadvisor;

    for (const prompt of [defaultPrompt, defaultSystemPrompt]) {
      expect(prompt).toContain("NEXT-001");
      const listRule = prompt.match(/(?:Write|Emit) ([^.]+) as YAML lists/);
      for (const field of ["inputs_to_prepare", "human_review", "assumptions", "limitations", "relevant_upstream_references"]) {
        expect(listRule?.[1]).toContain(field);
      }
      expect(prompt).toContain("interview_required");
      expect(prompt).toContain("focused_questions");
      expect(prompt).toMatch(/recommendation fields are not required for interview_required/i);
    }
    expect(defaultPrompt).toContain('human_review:\n  - "Project owner confirms scope."');
    expect(defaultSystemPrompt).toContain("positive numeric suffix");
    for (const invalidId of ["NEXT-security", "NEXT-review", "NEXT-1A"]) {
      expect(defaultSystemPrompt).toContain(invalidId);
    }
    expect(defaultSystemPrompt).toMatch(/never emit human_review as a scalar string/i);
  });
});
