import { describe, expect, it } from "vitest";
import { resolveQuickGuideContext, type QuickGuideNode } from "./quickGuide.js";

const workflowTypes = ["idea", "assetmapper", "reqelicitor", "nistgap", "securityadvisor"];

function workflowNodes(selectedIndex = -1): QuickGuideNode[] {
  return workflowTypes.map((type, index) => ({
    id: `box-${index}`,
    type,
    selected: index === selectedIndex,
    data: { title: index === 0 ? "Project Description" : undefined },
  }));
}

function workflowEdges() {
  return workflowTypes.slice(1).map((_, index) => ({ source: `box-${index}`, target: `box-${index + 1}` }));
}

describe("Quick Guide context resolution", () => {
  it("prioritizes the guided demo, then Add Box over selected content", () => {
    const nodes = workflowNodes(0);
    expect(resolveQuickGuideContext({ demoActive: true, sidebarOpen: true, nodes, edges: workflowEdges() })).toEqual({ kind: "guided-demo" });
    expect(resolveQuickGuideContext({ demoActive: false, sidebarOpen: true, nodes, edges: workflowEdges() })).toEqual({ kind: "add-box" });
  });

  it("recognizes a selected Project Description", () => {
    expect(resolveQuickGuideContext({
      demoActive: false,
      sidebarOpen: false,
      nodes: workflowNodes(0),
      edges: workflowEdges(),
    })).toEqual({ kind: "project-description" });
  });

  it("recognizes selected Documents and security workflow boxes", () => {
    expect(resolveQuickGuideContext({
      demoActive: false,
      sidebarOpen: false,
      nodes: [{ id: "docs", type: "documents", selected: true, data: {} }],
      edges: [],
    })).toEqual({ kind: "documents" });
    expect(resolveQuickGuideContext({
      demoActive: false,
      sidebarOpen: false,
      nodes: [{ id: "req", type: "reqelicitor", selected: true, data: {} }],
      edges: [],
    })).toEqual({ kind: "security-box", boxType: "reqelicitor" });
  });

  it("uses a selected generic box guide and respects its custom label", () => {
    expect(resolveQuickGuideContext({
      demoActive: false,
      sidebarOpen: false,
      nodes: [{ id: "worker", type: "research", selected: true, data: { title: "Threat Research" } }],
      edges: workflowEdges(),
    })).toEqual({ kind: "generic-box", boxType: "research", label: "Threat Research" });
  });

  it("shows the Security Assessment guide only for a connected workflow", () => {
    expect(resolveQuickGuideContext({
      demoActive: false,
      sidebarOpen: false,
      nodes: workflowNodes(),
      edges: workflowEdges(),
    })).toEqual({ kind: "security-workflow" });
    expect(resolveQuickGuideContext({
      demoActive: false,
      sidebarOpen: false,
      nodes: workflowNodes(),
      edges: [],
    })).toEqual({ kind: "general-board" });
    expect(resolveQuickGuideContext({ demoActive: false, sidebarOpen: false, nodes: [], edges: [] })).toEqual({ kind: "general-board" });
  });
});
