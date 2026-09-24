import type { BoxType } from "../types.js";
import { BOX_TYPES, SECURITY_ARTIFACT_BOX_TYPES } from "../types.js";
import { findSecurityWorkflow, type SecurityDemoEdge, type SecurityDemoNode } from "./securityDemo.js";

export interface QuickGuideNode extends SecurityDemoNode {
  selected?: boolean;
  data?: { boxType?: unknown; title?: unknown; customLabel?: unknown };
}

export type QuickGuideContext =
  | { kind: "guided-demo" }
  | { kind: "add-box" }
  | { kind: "project-description" }
  | { kind: "documents" }
  | { kind: "security-box"; boxType: (typeof SECURITY_ARTIFACT_BOX_TYPES)[number] }
  | { kind: "generic-box"; boxType: BoxType; label: string }
  | { kind: "security-workflow" }
  | { kind: "general-board" };

function boxTypeFor(node: QuickGuideNode): BoxType | null {
  const candidate = node.type || node.data?.boxType;
  return typeof candidate === "string" && Object.hasOwn(BOX_TYPES, candidate)
    ? candidate as BoxType
    : null;
}

function selectedBoxContext(nodes: readonly QuickGuideNode[]): QuickGuideContext | null {
  const node = nodes.find((candidate) => candidate.selected && boxTypeFor(candidate));
  if (!node) return null;

  const boxType = boxTypeFor(node)!;
  const title = typeof node.data?.title === "string" ? node.data.title.trim() : "";
  if (boxType === "idea" && title === "Project Description") return { kind: "project-description" };
  if (boxType === "documents") return { kind: "documents" };
  if ((SECURITY_ARTIFACT_BOX_TYPES as readonly string[]).includes(boxType)) {
    return { kind: "security-box", boxType: boxType as (typeof SECURITY_ARTIFACT_BOX_TYPES)[number] };
  }

  const customLabel = typeof node.data?.customLabel === "string" ? node.data.customLabel.trim() : "";
  return {
    kind: "generic-box",
    boxType,
    label: boxType === "custom" ? customLabel || title || BOX_TYPES.custom.label : title || BOX_TYPES[boxType].label,
  };
}

export function resolveQuickGuideContext({
  demoActive,
  sidebarOpen,
  nodes,
  edges,
}: {
  demoActive: boolean;
  sidebarOpen: boolean;
  nodes: readonly QuickGuideNode[];
  edges: readonly SecurityDemoEdge[];
}): QuickGuideContext {
  if (demoActive) return { kind: "guided-demo" };
  if (sidebarOpen) return { kind: "add-box" };

  const selected = selectedBoxContext(nodes);
  if (selected) return selected;

  if (findSecurityWorkflow(nodes, edges)) return { kind: "security-workflow" };
  return { kind: "general-board" };
}
