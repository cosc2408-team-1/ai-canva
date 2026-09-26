import { describe, expect, it } from "vitest";
import { SECURITY_ARTIFACT_BOX_TYPES } from "../types.js";
import {
  isSecurityWorkflowBox,
  securityWorkflowStageForBoxType,
  securityWorkflowStageNumber,
  securityWorkflowStages,
} from "./securityWorkflow.js";

// Team 2's boxes are structured security artifacts but sit outside the
// numbered four-stage workflow, so existing stage badges stay 1/4–4/4.
const UNSTAGED_SECURITY_BOXES = ["threatModeler", "riskScorer", "irPlanner"];

describe("security workflow metadata", () => {
  it("defines the four ordered stages and their artifact contracts", () => {
    const stages = securityWorkflowStages();
    expect(stages).toHaveLength(4);
    expect(stages.map(({ order }) => order)).toEqual([1, 2, 3, 4]);
    expect(stages.map(({ id, boxType, artifactType }) => [id, boxType, artifactType])).toEqual([
      ["discover", "assetmapper", "AssetPackage"],
      ["specify", "reqelicitor", "RequirementsPackage"],
      ["assess", "nistgap", "NISTAssessmentPackage"],
      ["advise", "securityadvisor", "NextStepGuidance"],
    ]);
  });

  it("maps each structured security box exactly once", () => {
    const stages = securityWorkflowStages();
    expect(new Set(stages.map(({ order }) => order)).size).toBe(stages.length);
    expect(new Set(stages.map(({ boxType }) => boxType)).size).toBe(stages.length);
    const staged = SECURITY_ARTIFACT_BOX_TYPES.filter((type) => !UNSTAGED_SECURITY_BOXES.includes(type));
    expect(stages.map(({ boxType }) => boxType).sort()).toEqual([...staged].sort());
    for (const type of UNSTAGED_SECURITY_BOXES) {
      expect(isSecurityWorkflowBox(type)).toBe(true);
      expect(securityWorkflowStageForBoxType(type)).toBeUndefined();
    }
    for (const type of staged) {
      expect(isSecurityWorkflowBox(type)).toBe(true);
      expect(securityWorkflowStageForBoxType(type)?.boxType).toBe(type);
      expect(securityWorkflowStageNumber(type)).toBeDefined();
    }
    expect(isSecurityWorkflowBox("research")).toBe(false);
    expect(securityWorkflowStageForBoxType("research")).toBeUndefined();
    expect(securityWorkflowStageNumber("research")).toBeUndefined();
  });
});
