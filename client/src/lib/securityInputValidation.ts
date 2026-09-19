import type { BoxType, NamedInput } from "../types.js";

const missingInputMessages: Partial<Record<BoxType, string>> = {
  reqelicitor:
    "Connect an Idea or Documents box containing a project description before running the Security Requirements Elicitor.",
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
