import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import Toolbar, { QuickGuideContent, isSecurityAssessmentWorkflow } from "./Toolbar.js";

function nodes(...types: string[]): Node[] {
  return types.map((type, index) => ({
    id: `different-id-${index}`,
    type,
    position: { x: 0, y: 0 },
    data: {},
  }));
}

describe("Quick Guide", () => {
  it("starts as a small, accessible Guide button", () => {
    const html = renderToStaticMarkup(createElement(Toolbar));
    expect(html).toContain("Guide");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Quick Guide</h2>");
  });

  it("recognizes the Security Assessment boxes without relying on node IDs", () => {
    expect(isSecurityAssessmentWorkflow(nodes(
      "idea", "assetmapper", "reqelicitor", "nistgap", "securityadvisor",
    ))).toBe(true);
    expect(isSecurityAssessmentWorkflow(nodes("idea", "assetmapper", "reqelicitor"))).toBe(false);
  });

  it("explains the Security workflow without leading with Add Box", () => {
    const html = renderToStaticMarkup(createElement(QuickGuideContent, { securityWorkflow: true }));
    for (const label of ["Project Description", "Discover", "Specify", "Assess", "Advise", "Needs clarification"]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("+ Add Box");
    expect(html).not.toContain("{{inputs}}");
  });

  it("keeps the manual guide short and focused on box editing", () => {
    const html = renderToStaticMarkup(createElement(QuickGuideContent, { securityWorkflow: false }));
    for (const label of ["+ Add Box", "Connect boxes", "Run", "resize"]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("Project Description");
    expect(html).not.toContain("{{input_1}}");
  });
});
