// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar.js";
import { BOX_TYPES, type BoxType } from "../types.js";

let container: HTMLDivElement;
let root: Root;
const onToggle = vi.fn();

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  localStorage.setItem("ai-canva:sidebar-role", "security");
  onToggle.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function renderSidebar() {
  await act(async () => root.render(createElement(Sidebar, {
    open: true,
    onToggle,
    isEmpty: false,
    emptyBoardMode: "onboarding",
    onCreateSecurityAssessment: vi.fn(),
    onBrowseTemplates: vi.fn(),
    onBuildManually: vi.fn(),
    onBackToGetStarted: vi.fn(),
  })));
}

describe("Security sidebar", () => {
  it("offers only the eleven security workflow tools even with a previously saved role", async () => {
    localStorage.setItem("ai-canva:sidebar-role", "developer");
    await renderSidebar();
    expect([...container.querySelectorAll<HTMLButtonElement>("button[data-box-type]")].map((row) => row.dataset.boxType))
      .toEqual(["idea", "documents", "assetmapper", "reqelicitor", "nistgap", "securityadvisor", "threatModeler", "riskScorer", "irPlanner", "note", "checklist"]);
    expect(container.querySelector("select")).toBeNull();
    expect(container.querySelector("details")).toBeNull();
  });

  it("shows each box's icon and readable name without numbered badges", async () => {
    await renderSidebar();
    const rows = [...container.querySelectorAll<HTMLButtonElement>("button.palette-row")];
    for (const row of rows) {
      const type = row.dataset.boxType as BoxType;
      expect(row.querySelector('[aria-hidden="true"]')?.textContent).toBe(BOX_TYPES[type].icon);
      expect(row.dataset.workflowStage).toBeUndefined();
    }
    for (const label of ["Asset Mapper", "Security Requirements Elicitor", "NIST CSF Gap Checker", "Security Advisor"]) {
      expect(container.textContent).toContain(label);
    }
    const elicitorRow = rows.find((row) => row.dataset.boxType === "reqelicitor")!;
    expect(elicitorRow.textContent).toContain("Security Requirements Elicitor");
    expect(elicitorRow.querySelector("span.flex-1")?.className).toContain("line-clamp-2");
    expect(elicitorRow.querySelector("span.flex-1")?.className).not.toContain("truncate");

    const threatModelerRow = rows.find((row) => row.textContent?.includes("Threat Modeler"));
    expect(threatModelerRow).toBeDefined();
    expect(threatModelerRow?.dataset.workflowStage).toBeUndefined();
  });

  it("does not show the sidebar workflow help", async () => {
    await renderSidebar();
    expect(container.textContent).not.toContain("How the security workflow works");
    expect(container.textContent).not.toContain("Stable IDs show where information came from");
  });

  it("keeps the explicit Hide panel control working", async () => {
    await renderSidebar();
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Hide panel"]')!.click());
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
