import { describe, expect, it } from "vitest";
import { validateSecurityArtifact } from "./securityArtifacts.js";
import { jennieSampleOutputs } from "./jennieSample.js";

describe("Jennie sample artifacts", () => {
  it("keeps every example output structurally valid and linked to its upstream inputs", () => {
    const outputs = jennieSampleOutputs("2026-09-28");
    const input = (boxType: keyof typeof outputs) => ({ boxType, output: outputs[boxType] });
    const upstream = {
      assetmapper: { assetmapper: input("assetmapper") },
      reqelicitor: { assetmapper: input("assetmapper") },
      nistgap: { reqelicitor: input("reqelicitor") },
      securityadvisor: { nistgap: input("nistgap") },
      threatModeler: { assetmapper: input("assetmapper") },
      riskScorer: { assetmapper: input("assetmapper"), threatModeler: input("threatModeler") },
      irPlanner: { assetmapper: input("assetmapper"), riskScorer: input("riskScorer") },
    };
    for (const boxType of Object.keys(outputs) as Array<keyof typeof outputs>) {
      const result = validateSecurityArtifact({
        boxType, output: outputs[boxType], upstreamArtifacts: upstream[boxType],
        trustedMetadata: { assessmentDate: "2026-09-28" },
      });
      expect(result.issues.filter((issue) => issue.severity === "error"), boxType).toEqual([]);
      expect(result.status, boxType).toBe("valid");
    }
  });
});
