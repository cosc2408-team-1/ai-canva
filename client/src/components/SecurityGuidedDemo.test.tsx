// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSecurityDemoStore } from "../store/securityDemoStore.js";
import { SecurityDemoAction, SecurityDemoCoachmark } from "./SecurityGuidedDemo.js";

let container: HTMLDivElement;
let root: Root;
const onFinish = vi.fn();

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  useSecurityDemoStore.getState().finish();
  onFinish.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  useSecurityDemoStore.getState().finish();
  container.remove();
});

async function render(element: React.ReactNode) {
  await act(async () => root.render(createElement(() => element)));
}

function coachmark(step: 0 | 1 | 2 | 3, overrides: Partial<React.ComponentProps<typeof SecurityDemoCoachmark>> = {}) {
  return createElement(SecurityDemoCoachmark, {
    active: true,
    step,
    artifactOutputCount: 4,
    hasRelatedTraceTarget: true,
    hasLensMatch: true,
    inspectorOpen: true,
    lensViewActive: true,
    lensTargetAvailable: false,
    onReopenInspector: vi.fn(),
    onFinish,
    ...overrides,
  });
}

describe("Security guided demo UI", () => {
  it("shows the entry action only when a Security Assessment workflow is available", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await render(createElement(SecurityDemoAction, { available: false, boardId: "board-a" }));
    expect(container.textContent).toBe("");

    await render(createElement(SecurityDemoAction, { available: true, boardId: "board-a" }));
    const start = [...container.querySelectorAll("button")].find((button) => button.textContent === "Start demo")!;
    await act(async () => start.click());
    expect(useSecurityDemoStore.getState()).toMatchObject({ active: true, step: 0, boardId: "board-a" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders step controls and moves through Previous, Next, and Finish", async () => {
    await render(coachmark(1));
    expect(container.textContent).toContain("2 / 4");
    expect(container.textContent).toContain("Structured, reviewable artifacts");

    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Close guided demo"]')!.click());
    expect(onFinish).toHaveBeenCalledOnce();

    useSecurityDemoStore.getState().start("board-a");
    useSecurityDemoStore.setState({ step: 2 });
    await render(coachmark(2));
    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Previous")!.click());
    expect(useSecurityDemoStore.getState().step).toBe(1);
    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Next")!.click());
    expect(useSecurityDemoStore.getState().step).toBe(2);

    useSecurityDemoStore.setState({ step: 3 });
    await render(coachmark(3));
    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Finish")!.click());
    expect(onFinish).toHaveBeenCalledTimes(2);
  });

  it("shows clear fallbacks for missing outputs, trace targets, and Lens matches", async () => {
    await render(coachmark(1, { artifactOutputCount: 0 }));
    expect(container.textContent).toContain("Run the Security Assessment stages first.");
    expect(container.textContent).toContain("Skip");

    await render(coachmark(2, { hasRelatedTraceTarget: false }));
    expect(container.textContent).toContain("A NIST finding is not required");

    await render(coachmark(3, { hasLensMatch: false }));
    expect(container.textContent).toContain("prefers no match over a weak signal");
  });

  it("gives a direct action when the Inspector is closed during the Lens step", async () => {
    const onReopenInspector = vi.fn();
    await render(coachmark(3, {
      inspectorOpen: false,
      lensTargetAvailable: true,
      onReopenInspector,
    }));
    expect(container.textContent).toContain("Reopen it to review the current workflow artifact");
    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Reopen Inspector")!.click());
    expect(onReopenInspector).toHaveBeenCalledOnce();
  });

  it("closes on Escape and makes no network request while navigating", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    useSecurityDemoStore.getState().start("board-a");
    await render(coachmark(0));
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(onFinish).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
