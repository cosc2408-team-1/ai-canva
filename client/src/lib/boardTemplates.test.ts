import { describe, expect, it } from "vitest";
import { BOX_TYPES, type BoxData, type BoxType } from "../types.js";
import { cleanBoxDataForFirestore } from "./serialization.js";
import { findSecurityWorkflow } from "./securityDemo.js";
import {
  BOARD_TEMPLATE_OPTIONS,
  DEFAULT_BOARD_TEMPLATE_ID,
  JENNIE_PROJECT_DESCRIPTION,
  createBoardTemplate,
  defaultBoardName,
  findJennieRunPlan,
} from "./boardTemplates.js";

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
  it("features Security Assessment first while keeping Blank Board available", () => {
    expect(DEFAULT_BOARD_TEMPLATE_ID).toBe("security-assessment");
    expect(BOARD_TEMPLATE_OPTIONS.map((option) => option.id)).toEqual([
      "security-assessment",
      "jennie-showcase",
      "blank",
    ]);
    expect(defaultBoardName("security-assessment")).toBe("Security Assessment");
    expect(defaultBoardName("jennie-showcase")).toBe("Jennie's Security Review");
    expect(defaultBoardName("blank")).toBe("Untitled Board");
  });

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

  it("describes the workflow at a glance", () => {
    const option = BOARD_TEMPLATE_OPTIONS.find((item) => item.id === "security-assessment");
    expect(option?.description).toContain("Discover assets");
    expect(option?.description).toContain("evidence-linked next-step guidance");
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

describe("Jennie showcase board template", () => {
  it("starts with the fictional student-app description ready to feed the first worker", () => {
    const template = createBoardTemplate("jennie-showcase", ids(), defaultBoxData);
    const idea = template.nodes.find((node) => node.type === "idea")!;

    expect(JENNIE_PROJECT_DESCRIPTION).toContain("Jennie is a university security reviewer");
    expect(JENNIE_PROJECT_DESCRIPTION).toContain("upload PDF or DOCX reports");
    expect(JENNIE_PROJECT_DESCRIPTION).toContain("Microsoft Entra ID");
    expect(JENNIE_PROJECT_DESCRIPTION).toContain("not verified controls");
    expect(template.boxData[idea.id]).toMatchObject({
      content: JENNIE_PROJECT_DESCRIPTION,
      output: JENNIE_PROJECT_DESCRIPTION,
      status: "idle",
    });
    expect(template.edges.some((edge) => edge.source === idea.id
      && template.nodes.find((node) => node.id === edge.target)?.type === "assetmapper")).toBe(true);
    expect(Object.values(cleanBoxDataForFirestore(template.boxData)).every(
      (data) => Object.values(data).every((value) => value !== undefined),
    )).toBe(true);
  });

  it("includes both teams' security boxes while retaining the guided demo path", () => {
    const template = createBoardTemplate("jennie-showcase", ids(), defaultBoxData);
    expect(template.nodes.map((node) => node.type)).toEqual([
      "idea", "assetmapper", "reqelicitor", "nistgap", "securityadvisor",
      "threatModeler", "riskScorer", "irPlanner",
    ]);
    expect(template.edges).toHaveLength(9);
    expect(findSecurityWorkflow(template.nodes, template.edges)).not.toBeNull();
    expect(findJennieRunPlan(template.nodes, template.edges)?.map(({ type }) => type)).toEqual([
      "assetmapper", "threatModeler", "riskScorer", "reqelicitor",
      "nistgap", "securityadvisor", "irPlanner",
    ]);
    for (const node of template.nodes.filter((node) => node.type !== "idea")) {
      expect(template.boxData[node.id]).toMatchObject({
        prompt: BOX_TYPES[node.type as BoxType].defaultPrompt,
        systemPrompt: BOX_TYPES[node.type as BoxType].defaultSystemPrompt,
        status: "idle",
        output: "",
      });
    }
  });

  it("does not offer the one-click run for an incomplete or rewired copy", () => {
    const template = createBoardTemplate("jennie-showcase", ids(), defaultBoxData);
    expect(findJennieRunPlan(template.nodes.slice(1), template.edges)).toBeNull();
    expect(findJennieRunPlan(template.nodes, template.edges.slice(1))).toBeNull();
    expect(findJennieRunPlan(createBoardTemplate("security-assessment", ids(), defaultBoxData).nodes, [])).toBeNull();
  });
});
