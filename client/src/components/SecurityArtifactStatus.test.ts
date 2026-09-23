import { describe, expect, it } from "vitest";
import { securityArtifactStatusPresentation } from "./SecurityArtifactStatus.js";

describe("SecurityArtifactStatus", () => {
  it.each([
    ["valid", "Valid"],
    ["warning", "Warning"],
    ["invalid", "Invalid"],
    ["clarification_required", "Needs clarification"],
  ] as const)("maps %s to a clear status label", (status, label) => {
    expect(securityArtifactStatusPresentation(status).label).toBe(label);
  });

  it("describes format states without implying security approval", () => {
    const descriptions = ["valid", "warning", "invalid", "clarification_required"]
      .map((status) => securityArtifactStatusPresentation(status as "valid" | "warning" | "invalid" | "clarification_required").description);
    const copy = descriptions.join(" ").toLowerCase();

    const validMeaning = securityArtifactStatusPresentation("valid").description;
    expect(validMeaning).toMatch(/format|integrity|references/i);
    expect(validMeaning).not.toMatch(/secure|compliant|certified|approved/i);
    expect(copy).toContain("format");
    expect(copy).toContain("project evidence");
    expect(copy).not.toMatch(/secure|compliant|certified|approved/);
  });
});
