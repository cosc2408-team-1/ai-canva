import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SecurityArtifactValidation, SecurityArtifactValidationStatus } from "../types.js";
import SecurityArtifactResult, { TechnicalArtifact } from "./SecurityArtifactResult.js";

const yaml = `artifact_type: AssetPackage
schema_version: "1.0"
status: clarification_required
assets: [{id: AST-001, name: Student profiles}]
evidence_register: [{id: EVID-001}]
open_questions:
  - Who owns the system?
  - Where is data stored?
  - How are sessions handled?
  - Who can access boards?`;

function validation(status: SecurityArtifactValidationStatus): SecurityArtifactValidation {
  return {
    status,
    artifactType: "AssetPackage",
    schemaVersion: "1.0",
    issues: status === "invalid" ? [{ code: "malformed_yaml", severity: "error", path: "output", message: "Malformed YAML." }] : [],
    validatedAt: 0,
    trustedMetadata: { assessmentDate: "" },
  };
}

function render(output: string, status: SecurityArtifactValidationStatus = "valid") {
  return renderToStaticMarkup(createElement(SecurityArtifactResult, {
    boxType: "assetmapper",
    output,
    validation: validation(status),
  }));
}

describe("SecurityArtifactResult", () => {
  it("shows Summary first and keeps raw YAML behind Technical artifact", () => {
    const html = render(yaml);
    expect(html).toContain("Assets discovered");
    expect(html).toContain("Technical artifact");
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("artifact_type: AssetPackage");
  });

  it("renders the exact original text in the technical view component", () => {
    const output = "artifact_type: AssetPackage\ncase_id: CASE-001\nquestion: keep  spaces\n";
    const html = renderToStaticMarkup(createElement(TechnicalArtifact, { output }));
    expect(html).toContain(output);
    expect(html).toContain("Exact generated YAML used by downstream stages.");
  });

  it("shows only three clarification items initially and leaves all available", () => {
    const html = render(yaml, "clarification_required");
    expect(html).toContain("Needs clarification");
    expect(html).toContain("more project evidence or clarification");
    expect(html).toContain("Who owns the system?");
    expect(html).toContain("How are sessions handled?");
    expect(html).not.toContain("Who can access boards?");
    expect(html).toContain("+ 1 more");
    expect(html).toContain("Show all questions (4)");
  });

  it("shows Asset Mapper open questions even for a valid legacy artifact", () => {
    const html = render(yaml.replace("status: clarification_required", "status: complete"));
    expect(html).toContain("Open questions");
    expect(html).toContain("Who owns the system?");
    expect(html).not.toContain("Who can access boards?");
    expect(html).toContain("Show all questions (4)");
    expect(html).not.toContain("More information needed");
  });

  it("keeps invalid status and issues prominent instead of showing a successful summary", () => {
    const html = render(yaml, "invalid");
    expect(html).toContain("Artifact integrity check failed");
    expect(html).toContain("Malformed YAML.");
    expect(html).toContain("Summary unavailable");
    expect(html).not.toContain("Assets discovered");
    expect(html).toContain("Technical artifact");
  });

  it("shows a warning alongside a parseable summary", () => {
    const html = render(yaml, "warning");
    expect(html).toContain("Usable artifact with validation warnings");
    expect(html).toContain("Assets discovered");
  });

  it("retains human decision boundaries without implying an external audit", () => {
    const html = render(yaml);
    expect(html).toContain("Human review before decisions");
    expect(html).toContain("Check asset names and evidence against the supplied project context.");
    expect(html).toContain("not approval or a compliance determination");
    expect(html).not.toContain("offline review");
  });

  it("preserves no-output and failed-rerun states", () => {
    expect(render("")).not.toContain("Technical artifact");
    const failed = renderToStaticMarkup(createElement(SecurityArtifactResult, {
      boxType: "assetmapper",
      output: yaml,
      validation: validation("valid"),
      isError: true,
    }));
    expect(failed).toContain("The latest run failed");
    expect(failed).not.toContain("Assets discovered");
    expect(failed).toContain("Technical artifact");
  });
});
