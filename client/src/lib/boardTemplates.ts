import type { Edge, Node } from "@xyflow/react";
import { BOX_TYPES, type BoxData, type BoxType } from "../types.js";

export type BoardTemplateId = "blank" | "security-assessment";

export interface BoardTemplateOption {
  id: BoardTemplateId;
  label: string;
  description: string;
}

export const BOARD_TEMPLATE_OPTIONS: readonly BoardTemplateOption[] = [
  {
    id: "blank",
    label: "Blank board",
    description: "Start with an empty canvas.",
  },
  {
    id: "security-assessment",
    label: "Security Assessment",
    description: "Project evidence to asset inventory, security requirements, NIST CSF gaps, and next-step advice.",
  },
];

interface TemplateBoxDefinition {
  key: string;
  type: BoxType;
  title: string;
  position: { x: number; y: number };
}

const SECURITY_ASSESSMENT_BOXES: readonly TemplateBoxDefinition[] = [
  { key: "project-description", type: "idea", title: "Project Description", position: { x: 80, y: 240 } },
  { key: "asset-mapper", type: "assetmapper", title: "Asset Mapper", position: { x: 480, y: 120 } },
  { key: "requirements-elicitor", type: "reqelicitor", title: "Security Requirements Elicitor", position: { x: 980, y: 120 } },
  { key: "nist-gap-checker", type: "nistgap", title: "NIST CSF Gap Checker", position: { x: 1480, y: 120 } },
  { key: "security-advisor", type: "securityadvisor", title: "Security Advisor", position: { x: 1980, y: 120 } },
];

const SECURITY_ASSESSMENT_CONNECTIONS = [
  ["project-description", "asset-mapper"],
  ["asset-mapper", "requirements-elicitor"],
  ["requirements-elicitor", "nist-gap-checker"],
  ["nist-gap-checker", "security-advisor"],
] as const;

export interface BoardTemplateContent {
  nodes: Node[];
  edges: Edge[];
  boxData: Record<string, BoxData>;
}

/**
 * Creates an empty board or the fixed Security Assessment workflow. The caller
 * supplies ID and default-data factories so this module stays independent of
 * store state while using the application's normal box defaults.
 */
export function createBoardTemplate(
  templateId: BoardTemplateId,
  createId: () => string,
  createDefaultBoxData: (type: BoxType) => BoxData,
): BoardTemplateContent {
  if (templateId === "blank") {
    return { nodes: [], edges: [], boxData: {} };
  }

  const nodeIds = new Map<string, string>();
  const nodes = SECURITY_ASSESSMENT_BOXES.map((definition) => {
    const id = createId();
    const meta = BOX_TYPES[definition.type];
    nodeIds.set(definition.key, id);

    return {
      id,
      type: definition.type,
      position: definition.position,
      data: {
        boxType: definition.type,
        title: definition.title,
      },
      style: {
        width: meta.defaultWidth,
        height: meta.defaultHeight,
      },
    } satisfies Node;
  });

  const boxData = Object.fromEntries(
    SECURITY_ASSESSMENT_BOXES.map((definition) => [
      nodeIds.get(definition.key)!,
      createDefaultBoxData(definition.type),
    ]),
  );

  const edges = SECURITY_ASSESSMENT_CONNECTIONS.map(([sourceKey, targetKey]) => ({
    id: createId(),
    source: nodeIds.get(sourceKey)!,
    target: nodeIds.get(targetKey)!,
    type: "smoothstep",
    animated: true,
  } satisfies Edge));

  return { nodes, edges, boxData };
}
