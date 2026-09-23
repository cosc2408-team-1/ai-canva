import { describe, expect, it } from "vitest";
import type { SecurityTraceGraph, TraceEntity, TraceRelation } from "./securityTraceability.js";
import { deriveMicrosoftSecurityLens } from "./microsoftSecurityLens.js";

function entity(id: string, label: string, detail?: string): TraceEntity {
  return { id, kind: "requirement", label, detail, occurrences: [] };
}

function graph(entities: TraceEntity[], relations: TraceRelation[] = []): SecurityTraceGraph {
  return { entities, relations };
}

describe("Microsoft Security Lens", () => {
  it.each([
    ["authentication and MFA", "Identity uses multi-factor authentication (MFA).", "entra-id"],
    ["API keys and secrets", "Store API keys and secrets safely.", "key-vault"],
    ["workload identity", "Use a managed workload identity.", "managed-identities"],
    ["cloud posture", "Review the cloud security posture and cloud configuration.", "defender-for-cloud"],
    ["security monitoring", "Centralize security logs for monitoring and incident response.", "sentinel"],
    ["data governance", "Classify sensitive data and define data governance.", "purview"],
    ["repository scanning", "Enable GitHub Advanced Security and code scanning.", "github-advanced-security"],
  ] as const)("maps %s to its capability", (_name, label, capabilityId) => {
    const result = deriveMicrosoftSecurityLens(graph([entity("REQ-001", label)]), "REQ-001");
    expect(result.matches.map(({ capability }) => capability.id)).toContain(capabilityId);
  });

  it("can return multiple capabilities in deterministic strongest-signal order", () => {
    const result = deriveMicrosoftSecurityLens(graph([
      entity("REQ-001", "Use MFA and store the API key in a vault."),
    ]), "REQ-001");

    expect(result.matches.map(({ capability }) => capability.id)).toEqual([
      "key-vault",
      "entra-id",
    ]);
  });

  it("deduplicates repeated signals and capabilities deterministically", () => {
    const input = graph([
      entity("REQ-001", "API key storage", "Protect the API key."),
      entity("EVID-001", "API key storage"),
    ], [
      { from: "REQ-001", to: "EVID-001", kind: "supports", sourceBoxId: "req-box", sourcePath: "requirements[0].source_refs[0]" },
      { from: "REQ-001", to: "EVID-001", kind: "supports", sourceBoxId: "req-box", sourcePath: "requirements[0].source_refs[1]" },
    ]);
    const result = deriveMicrosoftSecurityLens(input, "REQ-001");

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].matchedEvidence).toEqual([
      { sourceEntityId: "EVID-001", signal: "API key" },
      { sourceEntityId: "REQ-001", signal: "API key" },
    ]);
  });

  it("returns no match for unsupported or weak ambiguous words", () => {
    const result = deriveMicrosoftSecurityLens(graph([entity("REQ-001", "The key, cloud, and security matter.")]), "REQ-001");
    expect(result.matches).toEqual([]);
  });

  it.each([
    "Authentication is required.",
    "The application must enforce authorization.",
    "Prepare an incident response plan.",
    "Perform a data privacy review.",
    "Follow secure development practices.",
  ])("does not map a weak security signal: %s", (label) => {
    const result = deriveMicrosoftSecurityLens(graph([entity("REQ-001", label)]), "REQ-001");
    expect(result.matches).toEqual([]);
  });

  it("maps secret scanning only to GitHub Advanced Security", () => {
    const result = deriveMicrosoftSecurityLens(graph([
      entity("REQ-001", "Enable secret scanning for repositories."),
    ]), "REQ-001");

    expect(result.matches.map(({ capability }) => capability.id)).toEqual(["github-advanced-security"]);
  });

  it("maps secure API-key storage to Azure Key Vault", () => {
    const result = deriveMicrosoftSecurityLens(graph([
      entity("REQ-001", "Store API keys in secure secret storage."),
    ]), "REQ-001");

    expect(result.matches.map(({ capability }) => capability.id)).toEqual(["key-vault"]);
  });

  it("maps explicit MFA requirements to Microsoft Entra ID", () => {
    const result = deriveMicrosoftSecurityLens(graph([
      entity("REQ-001", "Require MFA for member authentication."),
    ]), "REQ-001");

    expect(result.matches.map(({ capability }) => capability.id)).toEqual(["entra-id"]);
  });

  it("does not join separate entity fields to create a phrase match", () => {
    const result = deriveMicrosoftSecurityLens(graph([
      entity("REQ-001", "cloud", "security posture"),
    ]), "REQ-001");
    expect(result.matches).toEqual([]);
  });

  it("uses selected entity text", () => {
    const result = deriveMicrosoftSecurityLens(graph([
      entity("REQ-001", "Keep an API key out of source code."),
      entity("REQ-002", "Unrelated requirement"),
    ]), "REQ-001");
    expect(result.matches[0].capability.id).toBe("key-vault");
  });

  it("uses direct-neighbor text and preserves source entity IDs", () => {
    const result = deriveMicrosoftSecurityLens(graph([
      entity("REQ-001", "Protect member sign-in."),
      entity("EVID-001", "MFA is required for authentication."),
    ], [
      { from: "EVID-001", to: "REQ-001", kind: "supports", sourceBoxId: "req-box", sourcePath: "requirements[0].source_refs[0]" },
    ]), "REQ-001");

    expect(result.matches[0].capability.id).toBe("entra-id");
    expect(result.matches[0].sourceEntityIds).toContain("EVID-001");
    expect(result.matches[0].matchedEvidence).toContainEqual({ sourceEntityId: "EVID-001", signal: "MFA" });
  });

  it("does not use text from an indirect-only entity", () => {
    const result = deriveMicrosoftSecurityLens(graph([
      entity("REQ-001", "Review access requirements."),
      entity("GAP-001", "Review the control."),
      entity("NEXT-001", "Store the API key in a secret vault."),
    ], [
      { from: "REQ-001", to: "GAP-001", kind: "assessed_by", sourceBoxId: "nist-box", sourcePath: "findings[0].related_requirements[0]" },
      { from: "GAP-001", to: "NEXT-001", kind: "informs_guidance", sourceBoxId: "advisor-box", sourcePath: "relevant_upstream_references[0]" },
    ]), "REQ-001");

    expect(result.matches).toEqual([]);
  });

  it("does not infer managed identities from an API-key-only signal", () => {
    const result = deriveMicrosoftSecurityLens(graph([entity("REQ-001", "Protect the API key.")]), "REQ-001");
    expect(result.matches.map(({ capability }) => capability.id)).toEqual(["key-vault"]);
  });

  it("does not mutate graph or artifact-derived input", () => {
    const input = graph([
      entity("REQ-001", "Use MFA."),
      entity("EVID-001", "Authentication evidence."),
    ], [
      { from: "EVID-001", to: "REQ-001", kind: "supports", sourceBoxId: "req-box", sourcePath: "requirements[0].source_refs[0]" },
    ]);
    const before = structuredClone(input);

    deriveMicrosoftSecurityLens(input, "REQ-001");

    expect(input).toEqual(before);
  });
});
