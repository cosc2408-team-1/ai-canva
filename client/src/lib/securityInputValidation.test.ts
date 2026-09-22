import { describe, expect, it } from "vitest";
import { BOX_TYPES, type BoxType } from "../types.js";
import { securityInputError } from "./securityInputValidation.js";

const cases = [
  ["assetmapper", "Connect an Idea or Documents box containing project or system information before running the Asset Mapper."],
  ["reqelicitor", "Connect and run an Asset Mapper, or connect an Idea or Documents box containing project evidence, before running the Security Requirements Elicitor."],
  ["nistgap", "Connect a box containing security requirements before running the NIST CSF Gap Checker."],
  ["securityadvisor", "Connect a box containing project or gap information before running the Security Advisor."],
] as const;

describe.each(cases)("%s required input", (boxType, message) => {
  it("reports what to connect when no text was collected", () => {
    expect(securityInputError(boxType, [])).toBe(message);
  });

  it.each(["", " \t\r\n", "\u00a0"])("rejects blank output %j even with a source label", (output) => {
    expect(securityInputError(boxType, [{ name: "Project description", output }])).toBe(message);
  });

  it("accepts text without changing its content", () => {
    const inputs = [{ name: "Idea", output: "  Azure web app storing customer records.\n" }];
    const before = structuredClone(inputs);
    expect(securityInputError(boxType, inputs)).toBeNull();
    expect(inputs).toEqual(before);
  });

  it("accepts usable text among empty connections", () => {
    expect(securityInputError(boxType, [
      { name: "Empty worker", output: "" },
      { name: "Requirements", output: "REQ-1: Administrative access SHALL require MFA." },
      { name: "Blank", output: "\n " },
    ])).toBeNull();
  });
});

it("leaves every unrelated box type unrestricted", () => {
  const protectedTypes: readonly string[] = cases.map(([type]) => type);
  for (const boxType of Object.keys(BOX_TYPES) as BoxType[]) {
    if (protectedTypes.includes(boxType)) continue;
    expect(securityInputError(boxType, [])).toBeNull();
  }
});

it("does not reject a non-empty clarification_required package", () => {
  expect(securityInputError("nistgap", [
    { name: "Elicitor", output: "artifact_type: RequirementsPackage\nstatus: clarification_required" },
  ])).toBeNull();
});
