import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import { BOX_TYPES, IR_CLARIFICATION_EVIDENCE_RULE, SECURITY_WORKER_YAML_RULE } from "../types.js";
import { securityWorkerSystemPrompt, securityWorkerUserPrompt } from "./securityWorkerPrompts.js";
import { jennieSampleOutputs } from "./jennieSample.js";
import { validateSecurityArtifact } from "./securityArtifacts.js";

const types = ["threatModeler", "riskScorer", "irPlanner"] as const;

describe("security worker output contracts", () => {
  it.each(types)("%s defaults require quoted strings and structured YAML", (type) => {
    for (const prompt of [BOX_TYPES[type].defaultPrompt, BOX_TYPES[type].defaultSystemPrompt]) {
      expect(prompt).toContain(SECURITY_WORKER_YAML_RULE);
      expect(prompt).toContain("Double-quote every string value");
      expect(prompt).toContain('technique_name: "Forge Web Credentials: SAML Tokens"');
      expect(prompt).toContain("risk_score as unquoted integers");
      expect(prompt).toContain("never a prose report or Markdown fences");
    }
  });

  it.each(types)("%s legacy requests gain the current contract without changing the original", (type) => {
    const legacy = "Preserve the supplied evidence. Format the result as a Markdown report.";
    const prompt = securityWorkerSystemPrompt(type, legacy);
    const artifactType = { threatModeler: "ThreatModel", riskScorer: "RiskRegister", irPlanner: "IncidentResponsePlan" }[type];
    expect(prompt.startsWith(legacy)).toBe(true);
    expect(prompt).toContain(`artifact_type: ${artifactType}`);
    expect(prompt).toContain('schema_version: "1.0"');
    expect(prompt).toContain("supersedes legacy report formatting");
    expect(prompt).not.toContain("{{inputs}}");
    expect(prompt.split(SECURITY_WORKER_YAML_RULE)).toHaveLength(2);
    expect(securityWorkerSystemPrompt(type, prompt)).toBe(prompt);
  });

  it.each(types)("%s new requests do not duplicate the contract", (type) => {
    const prompt = BOX_TYPES[type].defaultSystemPrompt;
    expect(securityWorkerSystemPrompt(type, prompt)).toBe(prompt);
  });

  it.each(["assetmapper", "reqelicitor", "nistgap", "securityadvisor", "research"] as const)("leaves %s unchanged", (type) => {
    expect(securityWorkerSystemPrompt(type, "Original instructions.")).toBe("Original instructions.");
  });

  it.each(types)("%s example remains a parseable schema-shaped mapping", (type) => {
    const example = BOX_TYPES[type].defaultPrompt.match(/\n(artifact_type:[\s\S]+?)\n\n(?:Rules:|Evidence rules:|Mode:)/)?.[1];
    expect(example).toBeTruthy();
    expect(parse(example!)).toMatchObject({ schema_version: "1.0", status: "complete" });
  });
});

describe("IR clarification request format", () => {
  it("ends legacy heading instructions with the current YAML schema without changing answers", () => {
    const answers = "User reports deployed rules and passed emulator tests; evidence is not attached.";
    const legacy = `Output each phase as a ## heading with **Known facts** and bullet lists.\n${answers}`;
    const prompt = securityWorkerUserPrompt("irPlanner", legacy);
    expect(prompt.startsWith(legacy)).toBe(true);
    expect(prompt).toContain(answers);
    expect(prompt.indexOf("Final IR output instructions")).toBeGreaterThan(prompt.indexOf("## heading"));
    expect(prompt).toContain("artifact_type: IncidentResponsePlan");
    expect(prompt).toContain(SECURITY_WORKER_YAML_RULE);
    expect(prompt).toContain(IR_CLARIFICATION_EVIDENCE_RULE);
    expect(prompt).not.toContain("{{inputs}}");
    expect(securityWorkerUserPrompt("irPlanner", prompt)).toBe(prompt);
  });

  it("does not duplicate a current IR contract", () => {
    expect(securityWorkerUserPrompt("irPlanner", BOX_TYPES.irPlanner.defaultPrompt)).toBe(BOX_TYPES.irPlanner.defaultPrompt);
  });

  it("does not let an old format marker omit the clarification evidence rule", () => {
    const old = `Legacy instructions.${SECURITY_WORKER_YAML_RULE}`;
    expect(securityWorkerUserPrompt("irPlanner", old)).toContain(IR_CLARIFICATION_EVIDENCE_RULE);
  });

  it.each(["threatModeler", "riskScorer", "assetmapper", "reqelicitor", "nistgap", "securityadvisor"] as const)("leaves %s user prompts untouched", (type) => {
    expect(securityWorkerUserPrompt(type, "Original evidence and instructions.")).toBe("Original evidence and instructions.");
  });

  it("does not equate supplied clarification answers with independent verification", () => {
    for (const prompt of [BOX_TYPES.irPlanner.defaultPrompt, BOX_TYPES.irPlanner.defaultSystemPrompt]) {
      expect(prompt).toContain("unverified user-reported evidence");
      expect(prompt).toContain("not independent proof of deployment, passed tests");
      expect(prompt).toContain("Do not invent missing evidence");
    }
  });
});

describe("strict YAML validation is unchanged", () => {
  const samples = jennieSampleOutputs("2026-10-22");
  it.each(types)("%s rejects unquoted colons and accepts quoted values without rewriting output", (type) => {
    const artifact = parse(samples[type]);
    const value = type === "threatModeler" ? "Forge Web Credentials: SAML Tokens"
      : type === "riskScorer" ? "Scenario: cross-group access"
      : "NIST SP 800-61 Rev. 2: superseded by Rev. 3";
    if (type === "threatModeler") {
      artifact.threats[0].attack_mapping = { technique_id: "unknown", technique_name: value, tactic: "unknown", match: "none", note: "Human verification required." };
    } else if (type === "riskScorer") artifact.risks[0].scenario = value;
    else artifact.framework_note = value;
    const quoted = stringify(artifact, { defaultStringType: "QUOTE_DOUBLE", lineWidth: 0 });
    const unquoted = quoted.replace(JSON.stringify(value), value);
    const valid = validateSecurityArtifact({ boxType: type, output: quoted });
    expect(valid.status).not.toBe("invalid");
    const invalid = validateSecurityArtifact({ boxType: type, output: unquoted });
    expect(invalid.status).toBe("invalid");
    expect(invalid.issues.some(issue => issue.code === "malformed_yaml")).toBe(true);
    expect(unquoted).toContain(value);
  });
});
