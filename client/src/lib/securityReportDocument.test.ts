import { describe, expect, it } from "vitest";
import { BOX_TYPES, type BoxData, type BoxType } from "../types.js";
import { createBoardTemplate } from "./boardTemplates.js";
import { buildSecurityReview } from "./securityReview.js";
import { buildSecurityReportDocument } from "./securityReportDocument.js";

function sampleReview() {
  let index = 0;
  const defaults = (type: BoxType): BoxData => ({ content: "", output: "", status: "idle", prompt: BOX_TYPES[type].defaultPrompt, systemPrompt: BOX_TYPES[type].defaultSystemPrompt });
  const board = createBoardTemplate("jennie-showcase", () => `box-${++index}`, defaults);
  return buildSecurityReview("Jennie's Security Review Sample", board.nodes, board.boxData);
}

describe("security report content", () => {
  it("preserves every repeated box and separates findings from unavailable results", () => {
    const review = sampleReview();
    const asset = review.stages.find((stage) => stage.type === "assetmapper")!;
    review.stages.push({ ...asset, id: "second-asset", output: asset.output.replace(/Uploaded student reports/g, "Additional project files") });
    review.stages.find((stage) => stage.type === "riskScorer")!.validationStatus = "invalid";
    review.missingStages.push("Additional threat model");
    const report = buildSecurityReportDocument(review);
    const content = report.sections.flatMap((section) => [section.heading, ...section.paragraphs]).join("\n");
    expect(content).toContain("Additional project files");
    expect(content).toContain("Uploaded student reports");
    expect(content).toContain("No results were available for Additional threat model");
    expect(content).not.toContain("16 out of 25");
    expect(content).not.toContain("Assessment approach");
    expect(content).toContain("fictional scenario");
  });
});
