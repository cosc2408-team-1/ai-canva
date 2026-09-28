import { describe, expect, it } from "vitest";
import { BOX_TYPES, type BoxData, type BoxType } from "../types.js";
import { createBoardTemplate } from "./boardTemplates.js";
import { buildSecurityReview } from "./securityReview.js";
import { buildSecurityReportNarrative } from "./securityReportNarrative.js";

function defaults(type: BoxType): BoxData {
  return {
    content: "", output: "", status: "idle",
    prompt: BOX_TYPES[type].defaultPrompt,
    systemPrompt: BOX_TYPES[type].defaultSystemPrompt,
  };
}

describe("security report narrative", () => {
  it("writes connected prose from the Jennie sample rather than listing YAML fields", () => {
    let index = 0;
    const board = createBoardTemplate("jennie-showcase", () => `box-${++index}`, defaults, new Date("2026-09-28"));
    const review = buildSecurityReview("Jennie's Security Review Sample", board.nodes, board.boxData);
    const report = buildSecurityReportNarrative(review);
    expect(review.stages).toHaveLength(7);
    expect(report.executiveSummary).toContain("fictional scenario");
    expect(report.executiveSummary).toContain("A student accesses another group's report");
    expect(report.sections.map((section) => section.heading)).toEqual([
      "Risk assessment", "Security gaps", "Security requirements", "Threat model",
      "Assets and evidence", "Recommended action", "Incident response readiness",
    ]);
    expect(report.sections.find((section) => section.heading === "Risk assessment")?.paragraphs.join(" "))
      .toContain("16 out of 25");
    expect(report.sections.find((section) => section.heading === "Security gaps")?.paragraphs.join(" "))
      .toContain("Access-control test results");
    expect(report.sections.find((section) => section.heading === "Security requirements")?.paragraphs.join(" "))
      .toContain("REQ-001");
    expect(report.sections.some((section) => section.paragraphs.some((text) => text.includes("artifact_type:")))).toBe(false);
  });
});
