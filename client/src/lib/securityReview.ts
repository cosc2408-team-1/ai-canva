import type { Node } from "@xyflow/react";
import {
  BOX_TYPES,
  isSecurityArtifactBoxType,
  type BoxData,
  type SecurityArtifactBoxType,
  type SecurityArtifactValidationStatus,
} from "../types.js";
import { slugifyFilename } from "./download.js";
import { summarizeSecurityArtifact, type SecurityArtifactSummary } from "./securityArtifactSummary.js";

/** Reading order for a security review, independent of canvas position. */
const STAGE_ORDER: readonly SecurityArtifactBoxType[] = [
  "assetmapper",
  "reqelicitor",
  "threatModeler",
  "riskScorer",
  "nistgap",
  "securityadvisor",
  "irPlanner",
];

export interface SecurityReviewStage {
  id: string;
  type: SecurityArtifactBoxType;
  title: string;
  output: string;
  boxStatus: BoxData["status"];
  sampleOutput: boolean;
  validationStatus: SecurityArtifactValidationStatus | "not_checked";
  summary: SecurityArtifactSummary | null;
}

export interface SecurityReviewContext {
  title: string;
  text: string;
}

export interface SecurityReview {
  title: string;
  boardTitle: string;
  generatedAt: Date;
  contexts: SecurityReviewContext[];
  stages: SecurityReviewStage[];
  missingStages: string[];
}

function nodeType(node: Node): string {
  return typeof node.data?.boxType === "string" ? node.data.boxType : node.type || "";
}

function nodeTitle(node: Node, fallback: string): string {
  const title = node.data?.title;
  return typeof title === "string" && title.trim() ? title.trim() : fallback;
}

export function buildSecurityReview(
  boardTitle: string,
  nodes: readonly Node[],
  boxData: Readonly<Record<string, BoxData>>,
  generatedAt = new Date(),
): SecurityReview {
  const normalizedTitle = boardTitle.trim() || "Untitled board";
  const title = /security review/i.test(normalizedTitle)
    ? normalizedTitle
    : `${normalizedTitle} Security Review`;

  const contexts = nodes.flatMap((node): SecurityReviewContext[] => {
    if (nodeType(node) !== "idea") return [];
    const data = boxData[node.id];
    const value = (data?.content || data?.output || "").trim();
    return value ? [{ title: nodeTitle(node, "Project description"), text: value }] : [];
  });

  const stages: SecurityReviewStage[] = [];
  const missingStages: string[] = [];
  const ordered = nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => isSecurityArtifactBoxType(nodeType(node)))
    .sort((a, b) =>
      STAGE_ORDER.indexOf(nodeType(a.node) as SecurityArtifactBoxType)
        - STAGE_ORDER.indexOf(nodeType(b.node) as SecurityArtifactBoxType)
        || a.index - b.index,
    );

  for (const { node } of ordered) {
    const type = nodeType(node) as SecurityArtifactBoxType;
    const data = boxData[node.id];
    const label = nodeTitle(node, BOX_TYPES[type].label);
    const output = data?.output || "";
    if (!output.trim()) {
      missingStages.push(label);
      continue;
    }
    const validationStatus = data.securityArtifactValidation?.status || "not_checked";
    stages.push({
      id: node.id,
      type,
      title: label,
      output,
      boxStatus: data.status,
      sampleOutput: data.sampleOutput === true,
      validationStatus,
      summary: validationStatus === "invalid" ? null : summarizeSecurityArtifact(type, output),
    });
  }

  return { title, boardTitle: normalizedTitle, generatedAt, contexts, stages, missingStages };
}

export function securityReviewFilename(boardTitle: string): string {
  const stem = slugifyFilename(boardTitle || "security-review");
  return `${stem.includes("security-review") ? stem : `${stem}-security-review`}.docx`;
}
