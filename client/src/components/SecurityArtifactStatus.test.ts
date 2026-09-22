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
});
