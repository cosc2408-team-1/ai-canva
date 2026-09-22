import { describe, expect, it } from "vitest";
import { BOX_TYPES, type BoxData, type BoxType } from "../types.js";
import { cleanBoxDataForFirestore } from "./serialization.js";
import { createBoardTemplate } from "./boardTemplates.js";

function ids() {
  let count = 0;
  return () => `id-${++count}`;
}

function defaultBoxData(type: BoxType): BoxData {
  return {
    content: "",
    prompt: BOX_TYPES[type].defaultPrompt,
    systemPrompt: BOX_TYPES[type].defaultSystemPrompt,
    output: "",
    status: "idle",
  };
}

describe("Security Assessment board template", () => {
  it("keeps the blank template empty", () => {
    expect(createBoardTemplate("blank", ids(), defaultBoxData)).toEqual({
      nodes: [],
      edges: [],
      boxData: {},
    });
  });

  it("creates the required five-box workflow with four directed edges", () => {
    const template = createBoardTemplate("security-assessment", ids(), defaultBoxData);

    expect(template.nodes.map((node) => node.type)).toEqual([
      "idea",
      "assetmapper",
      "reqelicitor",
      "nistgap",
      "securityadvisor",
    ]);
    expect(template.edges.map((edge) => [edge.source, edge.target])).toEqual([
      [template.nodes[0].id, template.nodes[1].id],
      [template.nodes[1].id, template.nodes[2].id],
      [template.nodes[2].id, template.nodes[3].id],
      [template.nodes[3].id, template.nodes[4].id],
    ]);
  });

  it("uses unique IDs and supplies the named workflow with normal metadata and box data", () => {
    const template = createBoardTemplate("security-assessment", ids(), defaultBoxData);
    const nodeIds = template.nodes.map((node) => node.id);
    const edgeIds = template.edges.map((edge) => edge.id);

    expect(new Set(nodeIds).size).toBe(nodeIds.length);
    expect(new Set(edgeIds).size).toBe(edgeIds.length);
    for (const edge of template.edges) {
      expect(nodeIds).toContain(edge.source);
      expect(nodeIds).toContain(edge.target);
    }
    expect(template.nodes.map((node) => node.data.title)).toEqual([
      "Project Description",
      "Asset Mapper",
      "Security Requirements Elicitor",
      "NIST CSF Gap Checker",
      "Security Advisor",
    ]);
    for (const node of template.nodes) {
      const type = node.type as BoxType;
      expect(node.style).toEqual({
        width: BOX_TYPES[type].defaultWidth,
        height: BOX_TYPES[type].defaultHeight,
      });
      expect(template.boxData[node.id]).toMatchObject({
        prompt: BOX_TYPES[type].defaultPrompt,
        systemPrompt: BOX_TYPES[type].defaultSystemPrompt,
        status: "idle",
        output: "",
      });
    }
  });

  it("uses Asset Mapper metadata and never starts an AI box automatically", () => {
    const template = createBoardTemplate("security-assessment", ids(), defaultBoxData);
    const mapper = template.nodes.find((node) => node.type === "assetmapper")!;

    expect(template.boxData[mapper.id]).toMatchObject({
      prompt: BOX_TYPES.assetmapper.defaultPrompt,
      systemPrompt: BOX_TYPES.assetmapper.defaultSystemPrompt,
      status: "idle",
      output: "",
    });
    expect(Object.values(template.boxData).every((data) => data.status === "idle")).toBe(true);
  });

  it("can be serialized for Firestore without undefined values", () => {
    const template = createBoardTemplate("security-assessment", ids(), (type) => ({
      ...defaultBoxData(type),
      imageData: undefined,
    }));

    expect(cleanBoxDataForFirestore(template.boxData)).toEqual(
      expect.not.objectContaining({ imageData: undefined }),
    );
    for (const data of Object.values(cleanBoxDataForFirestore(template.boxData))) {
      expect(Object.values(data)).not.toContain(undefined);
    }
  });
});
