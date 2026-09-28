import type { Edge, Node } from "@xyflow/react";
import { BOX_TYPES, type BoxData, type BoxType, type SecurityClarification } from "../types.js";
import { clarificationKey } from "./securityClarifications.js";
import { applicationAssessmentDate, validateSecurityArtifact } from "./securityArtifacts.js";
import { jennieSampleOutputs } from "./jennieSample.js";

export type BoardTemplateId = "blank" | "security-assessment" | "jennie-showcase";
export const DEFAULT_BOARD_TEMPLATE_ID: BoardTemplateId = "security-assessment";

export function defaultBoardName(templateId: BoardTemplateId): string {
  if (templateId === "security-assessment") return "Security Assessment";
  if (templateId === "jennie-showcase") return "Jennie's Security Review Sample";
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
    label: "Jennie's Security Review Sample",
    description: "Fictional student-app review with example results already filled in. Run the boxes to replace the samples with fresh AI output.",
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

/**
 * Fixed, fictional project-team answers used by the one-click Jennie run when
 * the Requirements Elicitor asks for clarification. They are a demo script, not
 * the model's own questions, and are labelled as such wherever they appear.
 */
export const JENNIE_CLARIFICATIONS: ReadonlyArray<{ question: string; whyItMatters: string; answer: string }> = [
  {
    question: "Is MFA enforced for every student, tutor and course administrator sign-in?",
    whyItMatters: "Determines whether account takeover protection is a stated requirement or an open gap.",
    answer: "MFA is planned through a Microsoft Entra ID Conditional Access policy for all three roles. The policy is drafted but has not been tested.",
  },
  {
    question: "How is access to uploaded reports restricted to the right group and its tutor?",
    whyItMatters: "Reports contain student names and assessment feedback, so access scope drives confidentiality requirements.",
    answer: "Draft Firebase Storage and Firestore rules scope files to the student's group and its assigned tutor. No access-control tests have been run yet.",
  },
  {
    question: "Where are sign-in, access and administrative actions logged, and who reviews them?",
    whyItMatters: "Needed to decide whether detection and audit requirements are supported by any evidence.",
    answer: "Only Firebase default logging is enabled. There is no central log collection and no one is assigned to review logs.",
  },
  {
    question: "How long are uploaded reports and student records retained?",
    whyItMatters: "Retention affects privacy obligations and the data that must be protected.",
    answer: "Until the end of the semester plus one year, then deleted by a manual clean-up. The clean-up has not been automated.",
  },
  {
    question: "How many course administrators are there, and do they use individual accounts?",
    whyItMatters: "Shared or excessive privileged accounts change the access-control and accountability requirements.",
    answer: "Two course administrators, each with an individual university account. There are no shared accounts.",
  },
];

/** The scripted answers as fully defined clarification entries (Firestore-safe). */
export function jennieClarificationEntries(actor: string, now: number): SecurityClarification[] {
  return JENNIE_CLARIFICATIONS.map(({ question, whyItMatters, answer }) => ({
    key: clarificationKey(question),
    question,
    whyItMatters,
    answer,
    answeredBy: actor,
    answeredAt: now,
    round: 1,
    source: "demo-script" as const,
  }));
}

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
  sampleDate = new Date(),
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

  const sampleAssessmentDate = applicationAssessmentDate(sampleDate);
  const sampleOutputs = templateId === "jennie-showcase" ? jennieSampleOutputs(sampleAssessmentDate) : null;
  const boxData = Object.fromEntries(
    definitions.map((definition) => [
      nodeIds.get(definition.key)!,
      {
        ...createDefaultBoxData(definition.type),
        ...(templateId === "jennie-showcase" && definition.key === "project-description"
          ? { content: JENNIE_PROJECT_DESCRIPTION, output: JENNIE_PROJECT_DESCRIPTION }
          : {}),
        ...(sampleOutputs && definition.type in sampleOutputs
          ? (() => {
              const type = definition.type as keyof typeof sampleOutputs;
              const output = sampleOutputs[type];
              const { parsed: _parsed, ...securityArtifactValidation } = validateSecurityArtifact({
                boxType: type, output, trustedMetadata: { assessmentDate: sampleAssessmentDate },
              });
              return { output, status: "done" as const, sampleOutput: true, securityArtifactValidation };
            })()
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
