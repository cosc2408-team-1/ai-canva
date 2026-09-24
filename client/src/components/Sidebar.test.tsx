// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar.js";

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

describe("Security sidebar guidance", () => {
  it("shows canonical Box names first and maps only the four workflow rows to steps 1-4", async () => {
    await renderSidebar();
    const rows = [...container.querySelectorAll<HTMLButtonElement>("button.palette-row")];
    const workflowRows = rows.filter((row) => row.dataset.workflowStage);

    expect(workflowRows.map((row) => row.dataset.workflowStage)).toEqual(["1", "2", "3", "4"]);
    for (const label of ["Asset Mapper", "Security Requirements Elicitor", "NIST CSF Gap Checker", "Security Advisor"]) {
      expect(container.textContent).toContain(label);
    }
    const elicitorRow = workflowRows[1];
    expect(elicitorRow.textContent).toContain("Security Requirements Elicitor");
    expect(elicitorRow.querySelector("span.flex-1")?.className).toContain("line-clamp-2");
    expect(elicitorRow.querySelector("span.flex-1")?.className).not.toContain("truncate");

    const threatModelerRow = rows.find((row) => row.textContent?.includes("Threat Modeler"));
    expect(threatModelerRow).toBeDefined();
    expect(threatModelerRow?.dataset.workflowStage).toBeUndefined();
  });

  it("shows traceability, human review, and distinct artifact status meanings", async () => {
    await renderSidebar();
    expect(container.textContent).toContain("Stable IDs show where information came from, not whether it is true.");
    expect(container.textContent).toContain("people make security and release decisions");
    expect(container.textContent).toContain("Valid — structure and references checked");
    expect(container.textContent).toContain("Needs clarification — more input required");
    expect(container.textContent).toContain("Invalid — fix before downstream use");
    expect(container.textContent).not.toContain("Microsoft recommends");
    expect(container.textContent).not.toContain("compliant");
  });

  it("keeps the explicit Hide panel control working", async () => {
    await renderSidebar();
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Hide panel"]')!.click());
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
