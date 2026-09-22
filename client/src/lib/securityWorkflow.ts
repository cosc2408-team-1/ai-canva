import {
  SECURITY_ARTIFACT_BOX_TYPES,
  type SecurityArtifactBoxType,
  type BoxType,
} from "../types.js";

export type SecurityWorkflowStageId = "discover" | "specify" | "assess" | "advise";

export interface SecurityWorkflowStage {
  id: SecurityWorkflowStageId;
  order: number;
  shortLabel: string;
  actionLabel: string;
  boxType: SecurityArtifactBoxType;
  artifactType: string;
  description: string;
  evidenceCue: string;
  humanReviewCue: string;
}

const STAGES: readonly SecurityWorkflowStage[] = [
  {
    id: "discover",
    order: 1,
    shortLabel: "Discover",
    actionLabel: "Discover",
    boxType: "assetmapper",
    artifactType: "AssetPackage",
    description: "Asset Mapper",
    evidenceCue: "Evidence → assets",
    humanReviewCue: "Check asset names and evidence against the supplied project context.",
  },
  {
    id: "specify",
    order: 2,
    shortLabel: "Specify",
    actionLabel: "Specify",
    boxType: "reqelicitor",
    artifactType: "RequirementsPackage",
    description: "Requirements Elicitor",
    evidenceCue: "Assets/evidence → testable requirements",
    humanReviewCue: "Review requirement scope and acceptance criteria with the project team.",
  },
  {
    id: "assess",
    order: 3,
    shortLabel: "Assess",
    actionLabel: "Assess",
    boxType: "nistgap",
    artifactType: "NISTAssessmentPackage",
    description: "NIST CSF Gap Checker",
    evidenceCue: "Requirements → preliminary gaps",
    humanReviewCue: "Validate framework mappings and implementation evidence with a qualified reviewer.",
  },
  {
    id: "advise",
    order: 4,
    shortLabel: "Advise",
    actionLabel: "Advise",
    boxType: "securityadvisor",
    artifactType: "NextStepGuidance",
    description: "Security Advisor",
    evidenceCue: "Artifacts → next action / questions",
    humanReviewCue: "Use the guidance as a discussion aid; people make risk and release decisions.",
  },
];

export function securityWorkflowStages(): readonly SecurityWorkflowStage[] {
  return STAGES;
}

export function securityWorkflowStageForBoxType(type: BoxType | string): SecurityWorkflowStage | undefined {
  return STAGES.find((stage) => stage.boxType === type);
}

export function securityWorkflowStageNumber(type: BoxType | string): number | undefined {
  return securityWorkflowStageForBoxType(type)?.order;
}

export function isSecurityWorkflowBox(type: BoxType | string): type is SecurityArtifactBoxType {
  return SECURITY_ARTIFACT_BOX_TYPES.includes(type as SecurityArtifactBoxType);
}
