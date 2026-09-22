import { describe, expect, it } from "vitest";
import { SECURITY_ARTIFACT_BOX_TYPES } from "../types.js";
import {
  isSecurityWorkflowBox,
  securityWorkflowStageForBoxType,
  securityWorkflowStageNumber,
  securityWorkflowStages,
} from "./securityWorkflow.js";

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
    expect(stages.map(({ boxType }) => boxType).sort()).toEqual([...SECURITY_ARTIFACT_BOX_TYPES].sort());
    for (const type of SECURITY_ARTIFACT_BOX_TYPES) {
      expect(isSecurityWorkflowBox(type)).toBe(true);
      expect(securityWorkflowStageForBoxType(type)?.boxType).toBe(type);
      expect(securityWorkflowStageNumber(type)).toBeDefined();
    }
    expect(isSecurityWorkflowBox("research")).toBe(false);
    expect(securityWorkflowStageForBoxType("research")).toBeUndefined();
    expect(securityWorkflowStageNumber("research")).toBeUndefined();
  });
});
