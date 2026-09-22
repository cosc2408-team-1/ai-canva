import type { BoxType, NamedInput } from "../types.js";

const missingInputMessages: Partial<Record<BoxType, string>> = {
  assetmapper:
    "Connect an Idea or Documents box containing project or system information before running the Asset Mapper.",
  reqelicitor:
    "Connect and run an Asset Mapper, or connect an Idea or Documents box containing project evidence, before running the Security Requirements Elicitor.",
  nistgap:
    "Connect a box containing security requirements before running the NIST CSF Gap Checker.",
  securityadvisor:
    "Connect a box containing project or gap information before running the Security Advisor.",
};

/** Checks text presence only; artifact completeness is a separate concern. */
export function securityInputError(
  boxType: BoxType,
  inputs: NamedInput[]
): string | null {
  if (inputs.some((input) => input.output.trim())) return null;
  return missingInputMessages[boxType] ?? null;
}
