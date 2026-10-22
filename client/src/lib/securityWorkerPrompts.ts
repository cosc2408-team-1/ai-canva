import { BOX_TYPES, IR_CLARIFICATION_EVIDENCE_RULE, SECURITY_WORKER_YAML_RULE, type BoxType } from "../types.js";

/** Supply current output contracts to legacy nodes without rewriting saved prompts. */
export function securityWorkerSystemPrompt(boxType: BoxType, systemPrompt: string): string {
  if (boxType !== "threatModeler" && boxType !== "riskScorer" && boxType !== "irPlanner") return systemPrompt;
  if (systemPrompt.includes(SECURITY_WORKER_YAML_RULE)) return systemPrompt;

  const box = BOX_TYPES[boxType];
  const contract = box.defaultPrompt
    .replace("{{inputs}}", "Use the connected evidence supplied in the user message.")
    .replace(SECURITY_WORKER_YAML_RULE, "");
  return `${systemPrompt}\n\nCurrent ${box.label} output contract (supersedes legacy report formatting):\n${box.defaultSystemPrompt}\n\n${contract}`;
}

/** Old IR instructions explicitly request headings; finish the request with the YAML contract. */
export function securityWorkerUserPrompt(boxType: BoxType, userPrompt: string): string {
  if (boxType !== "irPlanner") return userPrompt;
  if (userPrompt.includes(SECURITY_WORKER_YAML_RULE) && userPrompt.includes(IR_CLARIFICATION_EVIDENCE_RULE)) return userPrompt;

  const contract = BOX_TYPES.irPlanner.defaultPrompt
    .replace("{{inputs}}", "Use the connected evidence and clarification answers already supplied above.");
  return `${userPrompt}\n\nFinal IR output instructions (override earlier headings, bold-label or report-format instructions):\n${contract}`;
}
