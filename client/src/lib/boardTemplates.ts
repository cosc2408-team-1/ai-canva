import type { Edge, Node } from "@xyflow/react";
import { BOX_TYPES, type BoxData, type BoxType } from "../types.js";

export type BoardTemplateId = "blank" | "security-assessment" | "jennie-showcase";
export const DEFAULT_BOARD_TEMPLATE_ID: BoardTemplateId = "security-assessment";

export function defaultBoardName(templateId: BoardTemplateId): string {
  if (templateId === "security-assessment") return "Security Assessment";
  if (templateId === "jennie-showcase") return "Jennie's Security Review";
  return "Untitled Board";
}

export interface BoardTemplateOption {
  id: BoardTemplateId;
  label: string;
  description: string;
}

export const BOARD_TEMPLATE_OPTIONS: readonly BoardTemplateOption[] = [
  {
    id: "security-assessment",
    label: "Security Assessment",
    description: "Discover assets → specify security requirements → assess NIST CSF gaps → get evidence-linked next-step guidance.",
  },
  {
    id: "jennie-showcase",
    label: "Jennie's Security Review",
    description: "A fictional student-app review with the project description already filled in. Run the connected security boxes when you're ready.",
  },
  {
    id: "blank",
    label: "Blank board",
    description: "Start with an empty canvas.",
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

/** Fictional project context for the showcase. Planned controls are not proof of implementation. */
export const JENNIE_PROJECT_DESCRIPTION = `Case: JENNIE-DEMO-001 (fictional showcase scenario)

Jennie is a university security reviewer assessing a proposed student project portal before a pilot. Students will sign in with their university Microsoft accounts, join their assigned project group, upload PDF or DOCX reports, and view their group's files. Tutors will review submissions for their assigned groups. Course administrators will manage group membership.

The proposed app will use Microsoft Entra ID for sign-in, Firebase Hosting for the website, Firestore for student names, university email addresses, group membership and submission records, and Firebase Storage for uploaded reports. Reports may contain student names and assessment feedback. The team wants MFA for sign-in and access limited to the right students and tutors. Those are proposed behaviours, not verified controls.

Jennie has the project description but has not received deployed configuration, access-control test results or logging evidence. She needs a first-pass security review and a clear list of what to check with the project team. No live incident has been reported.`;

const JENNIE_SHOWCASE_BOXES: readonly TemplateBoxDefinition[] = [
  { key: "project-description", type: "idea", title: "Project Description", position: { x: 80, y: 430 } },
  { key: "asset-mapper", type: "assetmapper", title: "Asset Mapper", position: { x: 480, y: 310 } },
  { key: "requirements-elicitor", type: "reqelicitor", title: "Security Requirements Elicitor", position: { x: 980, y: 80 } },
  { key: "nist-gap-checker", type: "nistgap", title: "NIST CSF Gap Checker", position: { x: 1480, y: 80 } },
  { key: "security-advisor", type: "securityadvisor", title: "Security Advisor", position: { x: 1980, y: 80 } },
  { key: "threat-modeler", type: "threatModeler", title: "Threat Modeler", position: { x: 980, y: 660 } },
  { key: "risk-scorer", type: "riskScorer", title: "Risk Scorer", position: { x: 1480, y: 660 } },
  { key: "ir-planner", type: "irPlanner", title: "IR Planner", position: { x: 1980, y: 660 } },
];

const JENNIE_SHOWCASE_CONNECTIONS = [
  ...SECURITY_ASSESSMENT_CONNECTIONS,
  ["asset-mapper", "threat-modeler"],
  ["project-description", "risk-scorer"],
  ["threat-modeler", "risk-scorer"],
  ["project-description", "ir-planner"],
  ["risk-scorer", "ir-planner"],
] as const;

const JENNIE_RUN_KEYS = [
  "asset-mapper",
  "threat-modeler",
  "risk-scorer",
  "requirements-elicitor",
  "nist-gap-checker",
  "security-advisor",
  "ir-planner",
] as const;

export interface JennieRunStage {
  id: string;
  title: string;
  type: BoxType;
}

/** Only offer the one-click run while the template's original workflow is intact. */
export function findJennieRunPlan(nodes: readonly Node[], edges: readonly Edge[]): JennieRunStage[] | null {
  const tagged = nodes.filter((node) => node.data?.templateId === "jennie-showcase");
  if (tagged.length === 0) return null;
  const byKey = new Map<string, Node>();
  for (const node of tagged) {
    const key = node.data.templateKey;
    if (typeof key !== "string" || byKey.has(key)) return null;
    byKey.set(key, node);
  }
  if (JENNIE_SHOWCASE_BOXES.some(({ key, type }) => byKey.get(key)?.type !== type)) return null;
  const connected = new Set(edges.map(({ source, target }) => `${source}:${target}`));
  if (JENNIE_SHOWCASE_CONNECTIONS.some(([from, to]) =>
    !connected.has(`${byKey.get(from)!.id}:${byKey.get(to)!.id}`))) return null;

  return JENNIE_RUN_KEYS.map((key) => {
    const node = byKey.get(key)!;
    return { id: node.id, title: String(node.data.title || BOX_TYPES[node.type as BoxType].label), type: node.type as BoxType };
  });
}

export interface BoardTemplateContent {
  nodes: Node[];
  edges: Edge[];
  boxData: Record<string, BoxData>;
}

/**
 * Creates an empty board or one of the fixed security workflows. The caller
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

  const definitions = templateId === "jennie-showcase" ? JENNIE_SHOWCASE_BOXES : SECURITY_ASSESSMENT_BOXES;
  const connections = templateId === "jennie-showcase" ? JENNIE_SHOWCASE_CONNECTIONS : SECURITY_ASSESSMENT_CONNECTIONS;
  const nodeIds = new Map<string, string>();
  const nodes = definitions.map((definition) => {
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
        ...(templateId === "jennie-showcase"
          ? { templateId, templateKey: definition.key }
          : {}),
      },
      style: {
        width: meta.defaultWidth,
        height: meta.defaultHeight,
      },
    } satisfies Node;
  });

  const boxData = Object.fromEntries(
    definitions.map((definition) => [
      nodeIds.get(definition.key)!,
      {
        ...createDefaultBoxData(definition.type),
        ...(templateId === "jennie-showcase" && definition.key === "project-description"
          ? { content: JENNIE_PROJECT_DESCRIPTION, output: JENNIE_PROJECT_DESCRIPTION }
          : {}),
      },
    ]),
  );

  const edges = connections.map(([sourceKey, targetKey]) => ({
    id: createId(),
    source: nodeIds.get(sourceKey)!,
    target: nodeIds.get(targetKey)!,
    type: "smoothstep",
    animated: true,
  } satisfies Edge));

  return { nodes, edges, boxData };
}
