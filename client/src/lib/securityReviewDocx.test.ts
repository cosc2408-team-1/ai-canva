import { describe, expect, it } from "vitest";
import { buildSecurityReview } from "./securityReview.js";
import { securityReviewDocxBlob } from "./securityReviewDocx.js";

describe("security review Word document", () => {
  it("generates a nonempty DOCX from saved security outputs", async () => {
    const review = buildSecurityReview("Student portal", [{
      id: "asset", type: "assetmapper", position: { x: 0, y: 0 },
      data: { boxType: "assetmapper", title: "Asset Mapper" },
    }], {
      asset: {
        content: "", prompt: "", systemPrompt: "", status: "done",
        output: "artifact_type: AssetPackage\nschema_version: '1.0'\nstatus: complete\nassets:\n  - id: AST-001\n    name: Student reports\nevidence_register: []\nopen_questions: []",
      },
    });
    const blob = await securityReviewDocxBlob(review);
    const signature = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    expect(blob.type).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(blob.size).toBeGreaterThan(2000);
    expect([...signature]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const mammoth = await import("mammoth");
    const extracted = await mammoth.extractRawText({ buffer: Buffer.from(await blob.arrayBuffer()) });
    expect(extracted.value).toContain("Student portal Security Review");
    expect(extracted.value).toContain("Executive summary");
    expect(extracted.value).toContain("Assets and evidence");
    expect(extracted.value).toContain("The asset inventory identifies 1 asset");
    expect(extracted.value).toContain("Limitations and further work");
    expect(extracted.value).not.toContain("artifact_type: AssetPackage");
    expect(extracted.value).not.toContain("Assessment approach");
    expect(extracted.value).toContain("3.1  Assets and evidence");
  });
});
