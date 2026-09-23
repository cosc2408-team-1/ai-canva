import type { SecurityTraceGraph, TraceEntity } from "./securityTraceability.js";

export type MicrosoftCapabilityId =
  | "entra-id"
  | "key-vault"
  | "managed-identities"
  | "defender-for-cloud"
  | "sentinel"
  | "purview"
  | "github-advanced-security";

export interface MicrosoftCapability {
  id: MicrosoftCapabilityId;
  name: string;
  description: string;
  officialUrl: string;
}

export interface MicrosoftSecurityLensSignal {
  sourceEntityId: string;
  signal: string;
}

export interface MicrosoftSecurityLensMatch {
  capability: MicrosoftCapability;
  matchedSignals: string[];
  sourceEntityIds: string[];
  matchedEvidence: MicrosoftSecurityLensSignal[];
  rationale: string;
}

export interface MicrosoftSecurityLensResult {
  selectedEntityId: string;
  matches: MicrosoftSecurityLensMatch[];
}

interface CapabilityRule extends MicrosoftCapability {
  signals: readonly string[];
  rationale: string;
}

const CATALOGUE: readonly CapabilityRule[] = [
  {
    id: "entra-id",
    name: "Microsoft Entra ID",
    description: "Identity and access management for authentication, authorization, MFA, and conditional access.",
    officialUrl: "https://learn.microsoft.com/en-us/entra/identity/",
    rationale: "Identity and access signals in this trace context make Microsoft Entra ID a relevant capability to evaluate.",
    signals: [
      "conditional access", "multifactor authentication", "multi factor authentication",
      "multi-factor authentication", "mfa",
    ],
  },
  {
    id: "key-vault",
    name: "Azure Key Vault",
    description: "A managed service for application secrets, cryptographic keys, and certificates.",
    officialUrl: "https://learn.microsoft.com/en-us/azure/key-vault/general/overview",
    rationale: "Secret, key, or certificate handling in this trace context makes Azure Key Vault a relevant capability to evaluate.",
    signals: [
      "credential storage", "secret management", "secrets management", "secret storage",
      "cryptographic keys", "encryption keys", "api keys", "api key", "access keys", "access key",
    ],
  },
  {
    id: "managed-identities",
    name: "Managed identities for Azure resources",
    description: "Azure workload identities that authenticate to supported services without application-managed credentials.",
    officialUrl: "https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview",
    rationale: "An explicit workload or service identity signal makes managed identities a relevant Azure-specific option to evaluate.",
    signals: [
      "service to service authentication", "managed identities", "managed identity", "workload identities",
      "workload identity", "service identities", "service identity", "application identity",
      "machine identity", "embedded credentials",
    ],
  },
  {
    id: "defender-for-cloud",
    name: "Microsoft Defender for Cloud",
    description: "Cloud security posture and workload protection capabilities for cloud and hybrid environments.",
    officialUrl: "https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-cloud-introduction",
    rationale: "Cloud posture, configuration, or workload-protection signals make Defender for Cloud a relevant capability to evaluate.",
    signals: [
      "cloud security posture", "security posture management", "cloud misconfiguration", "cloud configuration",
      "cloud workload protection", "workload protection", "cloud security recommendation", "cspm",
    ],
  },
  {
    id: "sentinel",
    name: "Microsoft Sentinel",
    description: "A cloud-native SIEM and security platform for security data, detection, investigation, and response.",
    officialUrl: "https://learn.microsoft.com/en-us/azure/sentinel/sentinel-overview",
    rationale: "Security logging, threat detection, or incident-response signals make Microsoft Sentinel a relevant capability to evaluate.",
    signals: [
      "threat detection", "security analytics", "security monitoring", "security logging",
      "security logs", "security events", "log management", "siem", "soar",
    ],
  },
  {
    id: "purview",
    name: "Microsoft Purview",
    description: "Data security, governance, and compliance capabilities for discovering, protecting, and managing data.",
    officialUrl: "https://learn.microsoft.com/en-us/purview/purview",
    rationale: "Data classification, governance, or sensitive-information signals make Microsoft Purview a relevant capability to evaluate.",
    signals: [
      "data classification", "data governance", "sensitive information", "sensitive data",
      "information protection", "data loss prevention", "dlp",
    ],
  },
  {
    id: "github-advanced-security",
    name: "GitHub Advanced Security",
    description: "Repository security features including code scanning, secret scanning, and dependency review.",
    officialUrl: "https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security",
    rationale: "Repository, code-scanning, or dependency-security signals make GitHub Advanced Security a relevant capability to evaluate.",
    signals: [
      "github advanced security", "software supply chain security", "dependency scanning", "dependency review",
      "secret scanning", "code scanning", "repository security", "repo security", "code security",
    ],
  },
];

export const MICROSOFT_CAPABILITIES: readonly MicrosoftCapability[] = CATALOGUE.map(({
  signals: _signals,
  rationale: _rationale,
  ...capability
}) => capability);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchedPhrase(text: string, phrase: string): string | undefined {
  const normalizedPhrase = normalize(phrase);
  const pattern = normalizedPhrase.split(" ").join("[^a-z0-9]+");
  const match = new RegExp(`(?:^|[^a-z0-9])(${pattern})(?:$|[^a-z0-9])`, "i").exec(text);
  return match?.[1];
}

function directContext(graph: SecurityTraceGraph, selectedEntityId: string): TraceEntity[] {
  const selected = graph.entities.find(({ id }) => id === selectedEntityId);
  if (!selected) return [];

  const directIds = new Set<string>();
  for (const relation of graph.relations) {
    if (relation.from === selectedEntityId) directIds.add(relation.to);
    if (relation.to === selectedEntityId) directIds.add(relation.from);
  }

  return [selected, ...graph.entities.filter(({ id }) => id !== selectedEntityId && directIds.has(id))];
}

export function deriveMicrosoftSecurityLens(
  graph: SecurityTraceGraph,
  selectedEntityId: string,
): MicrosoftSecurityLensResult {
  const context = directContext(graph, selectedEntityId);
  const matches = CATALOGUE.flatMap((rule) => {
    const matchedEvidence: MicrosoftSecurityLensSignal[] = [];
    for (const signal of rule.signals) {
      for (const entity of context) {
        const actualSignal = matchedPhrase(entity.label, signal) || matchedPhrase(entity.detail || "", signal);
        if (!actualSignal) continue;
        if (matchedEvidence.some((item) => item.sourceEntityId === entity.id && normalize(item.signal) === normalize(actualSignal))) continue;
        matchedEvidence.push({ sourceEntityId: entity.id, signal: actualSignal });
      }
    }
    if (!matchedEvidence.length) return [];

    return [{
      capability: {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        officialUrl: rule.officialUrl,
      },
      matchedSignals: matchedEvidence.reduce<string[]>((signals, { signal }) => {
        if (!signals.some((existing) => normalize(existing) === normalize(signal))) signals.push(signal);
        return signals;
      }, []),
      sourceEntityIds: [...new Set(matchedEvidence.map(({ sourceEntityId }) => sourceEntityId))],
      matchedEvidence,
      rationale: rule.rationale,
    }];
  });

  return {
    selectedEntityId,
    matches,
  };
}
