// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useBoardStore } from "../store/boardStore.js";
import { useSecurityDemoStore } from "../store/securityDemoStore.js";
import Toolbar, { QuickGuideContent } from "./Toolbar.js";

const content = (kind: "add-box" | "project-description" | "documents" | "security-workflow" | "general-board") =>
  renderToStaticMarkup(createElement(QuickGuideContent, { context: { kind } }));

let demoRoot: Root | undefined;
let demoContainer: HTMLDivElement | undefined;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

describe("Quick Guide", () => {
  beforeEach(() => {
    useBoardStore.setState({ nodes: [], edges: [] });
    useSecurityDemoStore.getState().finish();
  });

  afterEach(async () => {
    if (demoRoot) await act(async () => demoRoot?.unmount());
    demoContainer?.remove();
    demoRoot = undefined;
    demoContainer = undefined;
  });

  it("starts as a small accessible Guide button", () => {
    const html = renderToStaticMarkup(createElement(Toolbar, { sidebarOpen: false }));
    expect(html).toContain("Guide");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Quick Guide</h2>");
  });

  it("hides while the guided demo is active", async () => {
    demoContainer = document.createElement("div");
    document.body.append(demoContainer);
    demoRoot = createRoot(demoContainer);
    await act(async () => demoRoot?.render(createElement(Toolbar, { sidebarOpen: false })));
    expect(demoContainer.textContent).toContain("Guide");
    await act(async () => useSecurityDemoStore.getState().start("board-a"));
    expect(demoContainer.textContent).toBe("");
  });

  it("shows concise Add Box instructions and makes the no-run behavior explicit", () => {
    const html = content("add-box");
    for (const phrase of ["Choose a box", "Connect inputs", "Configure", "Run when ready", "Adding a box does not run AI."]) {
      expect(html).toContain(phrase);
    }
  });

  it("gives Project Description and Documents their own evidence-focused guidance", () => {
    const project = renderToStaticMarkup(createElement(QuickGuideContent, { context: { kind: "project-description" } }));
    expect(project).toContain("Describe the system");
    expect(project).toContain("Keep it factual");

    const documents = content("documents");
    expect(documents).toContain("Add project evidence");
    expect(documents).toContain("Connect this box");
    expect(documents).toContain("Documents provide evidence; they do not run AI themselves.");
  });

  it("uses the canonical Security Requirements Elicitor name and scoped guidance", () => {
    const html = renderToStaticMarkup(createElement(QuickGuideContent, {
      context: { kind: "security-box", boxType: "reqelicitor" },
    }));
    expect(html).toContain("Security Requirements Elicitor");
    expect(html).toContain("Turn supplied assets and evidence into testable requirements.");
  });

  it("presents the workflow steps, traceability, human decisions, and reviewable statuses", () => {
    const html = content("security-workflow");
    for (const phrase of [
      "Security Assessment Guide",
      "Discover → Specify → Assess → Advise",
      "Summary for a quick review",
      "Select a stable ID to open Traceability",
      "Microsoft Security Lens",
      "people make security and compliance decisions",
    ]) expect(html).toContain(phrase);
  });

  it("keeps the general board guide free of Security Assessment assumptions", () => {
    const html = content("general-board");
    for (const phrase of ["General Board Guide", "Connect boxes", "Boards auto-save when signed in."]) {
      expect(html).toContain(phrase);
    }
    expect(html).not.toContain("NIST");
    expect(html).not.toContain("Microsoft Security Lens");
  });
});
