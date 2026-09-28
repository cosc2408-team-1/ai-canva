import type { Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import type { BoxData, BoxType } from "../types.js";
import { buildSecurityReview, securityReviewFilename } from "./securityReview.js";

function node(id: string, type: BoxType, title?: string): Node {
  return { id, type, position: { x: 0, y: 0 }, data: { boxType: type, title } };
}

function data(output = "", content = "", status: BoxData["status"] = "done"): BoxData {
  return { output, content, status, prompt: "", systemPrompt: "" };
}

const assetOutput = `artifact_type: AssetPackage
schema_version: "1.0"
status: complete
assets:
  - id: AST-001
    name: Student reports
evidence_register: []
open_questions: []`;

describe("security review export model", () => {
  it("includes project context and every saved security output in reading order", () => {
    const nodes = [
      node("idea", "idea", "Project brief"),
      node("risk", "riskScorer", "Risk Scorer"),
      node("asset", "assetmapper", "Asset Mapper"),
      node("req", "reqelicitor", "Requirements Elicitor"),
      node("note", "note", "Private note"),
    ];
    const review = buildSecurityReview("Jennie's Security Review", nodes, {
      idea: data("", "Students upload reports."),
      asset: { ...data(assetOutput), securityArtifactValidation: {
        status: "valid", artifactType: "AssetPackage", schemaVersion: "1.0",
        issues: [], validatedAt: 1, trustedMetadata: { assessmentDate: "" },
      } },
      req: data("  "),
      risk: data("artifact_type: RiskRegister\nstatus: complete\nrisks: []"),
      note: data("Do not export this note"),
    }, new Date("2026-09-28T00:00:00Z"));

    expect(review.title).toBe("Jennie's Security Review");
    expect(review.contexts).toEqual([{ title: "Project brief", text: "Students upload reports." }]);
    expect(review.stages.map((stage) => stage.type)).toEqual(["assetmapper", "riskScorer"]);
    expect(review.stages[0].output).toBe(assetOutput);
    expect(review.stages[0].summary?.metrics[0]).toEqual({ label: "Assets", count: 1 });
    expect(review.stages[1].validationStatus).toBe("not_checked");
    expect(review.missingStages).toEqual(["Requirements Elicitor"]);
    expect(review.stages.some((stage) => stage.output.includes("Private note"))).toBe(false);
  });

  it("keeps invalid and older outputs but does not present them as validated summaries", () => {
    const review = buildSecurityReview("Portal", [node("asset", "assetmapper")], {
      asset: { ...data(assetOutput, "", "error"), securityArtifactValidation: {
        status: "invalid", artifactType: "AssetPackage", schemaVersion: "1.0",
        issues: [{ code: "shape", severity: "error", path: "assets", message: "Invalid" }],
        validatedAt: 1, trustedMetadata: { assessmentDate: "" },
      } },
    });
    expect(review.stages[0].output).toBe(assetOutput);
    expect(review.stages[0].boxStatus).toBe("error");
    expect(review.stages[0].summary).toBeNull();
    expect(review.stages[0].validationStatus).toBe("invalid");
  });

  it("uses safe filenames without repeating security review", () => {
    expect(securityReviewFilename("Jennie's Security Review")).toBe("jennie-s-security-review.docx");
    expect(securityReviewFilename("Jennie's Security Review Sample")).toBe("jennie-s-security-review-sample.docx");
    expect(securityReviewFilename("Student portal")).toBe("student-portal-security-review.docx");
  });
});
