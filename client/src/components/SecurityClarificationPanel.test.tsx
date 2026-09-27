// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SecurityArtifactValidation, SecurityClarification } from "../types.js";
import SecurityClarificationPanel, { type SecurityClarificationControls } from "./SecurityClarificationPanel.js";

const output = `artifact_type: RequirementsPackage
schema_version: "1.0"
status: clarification_required
open_questions:
  - question: Is MFA enforced for administrators?
    why_it_matters: Decides whether privileged access is protected.
  - Where are logs stored?`;

const validation: SecurityArtifactValidation = {
  status: "clarification_required", artifactType: "RequirementsPackage", schemaVersion: "1.0",
  issues: [], validatedAt: 42, trustedMetadata: { assessmentDate: "" },
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

function controls(overrides: Partial<SecurityClarificationControls> = {}): SecurityClarificationControls {
  return {
    entries: [], actor: "Ana",
    onSave: vi.fn(), onSaveAndRerun: vi.fn(), onProceed: vi.fn(), onUndoProceed: vi.fn(),
    ...overrides,
  };
}

async function render(props: { controls: SecurityClarificationControls; needsClarification?: boolean; boxType?: "reqelicitor" | "securityadvisor" }) {
  await act(async () => root.render(createElement(SecurityClarificationPanel, {
    boxType: props.boxType ?? "reqelicitor",
    output,
    validation,
    needsClarification: props.needsClarification ?? true,
    controls: props.controls,
  })));
}

function button(label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find((item) => item.textContent?.trim() === label);
  if (!found) throw new Error(`No button ${label}`);
  return found as HTMLButtonElement;
}

async function type(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("SecurityClarificationPanel", () => {
  it("lists the artifact's questions with why they matter and the no-secrets hint", async () => {
    await render({ controls: controls() });
    expect(container.textContent).toContain("1. Is MFA enforced for administrators?");
    expect(container.textContent).toContain("Why it matters: Decides whether privileged access is protected.");
    expect(container.textContent).toContain("2. Where are logs stored?");
    expect(container.textContent).toContain("Don't include passwords, keys, tokens or personal data.");
    expect(button("Save answers").disabled).toBe(true);
  });

  it("saves typed and 'I don't know' answers only on Save", async () => {
    const onSave = vi.fn();
    const onSaveAndRerun = vi.fn();
    await render({ controls: controls({ onSave, onSaveAndRerun }) });
    const [first] = container.querySelectorAll("textarea");
    await type(first as HTMLTextAreaElement, "Planned, untested");
    expect(onSave).not.toHaveBeenCalled();
    const unknownButtons = [...container.querySelectorAll("button")].filter((item) => item.textContent === "I don't know");
    await act(async () => unknownButtons[1].click());
    await act(async () => button("Save answers").click());
    const saved: SecurityClarification[] = onSave.mock.calls[0][0];
    expect(saved.map((entry) => [entry.question, entry.answer, entry.answeredBy])).toEqual([
      ["Is MFA enforced for administrators?", "Planned, untested", "Ana"],
      ["Where are logs stored?", "unknown", "Ana"],
    ]);
    await act(async () => button("Save & rerun").click());
    expect(onSaveAndRerun).toHaveBeenCalledTimes(1);
  });

  it("offers Proceed on the Elicitor and shows the recorded override with Undo", async () => {
    const onProceed = vi.fn();
    await render({ controls: controls({ onProceed }) });
    await act(async () => button("Proceed with unresolved questions").click());
    expect(onProceed).toHaveBeenCalled();

    const onUndoProceed = vi.fn();
    await render({ controls: controls({ onUndoProceed, override: { by: "Demo run", at: 0, validatedAt: 42 } }) });
    expect(container.querySelector("[data-testid=clarification-override]")?.textContent).toContain("Proceeded with unresolved questions: Demo run");
    await act(async () => button("Undo").click());
    expect(onUndoProceed).toHaveBeenCalled();
  });

  it("does not offer Proceed on the Advisor, which gates nothing", async () => {
    await render({ boxType: "securityadvisor", controls: controls() });
    expect(container.textContent).not.toContain("Proceed with unresolved questions");
  });

  it("labels scripted demo answers separately and hides when there is nothing to show", async () => {
    const scripted: SecurityClarification = {
      key: "who owns it?", question: "Who owns it?", whyItMatters: "", answer: "The registrar.",
      answeredBy: "Demo run", answeredAt: 1, round: 1, source: "demo-script",
    };
    await render({ controls: controls({ entries: [scripted] }) });
    expect(container.textContent).toContain("Scripted demo answers (fictional) (1)");
    expect(container.textContent).toContain("Who owns it?");

    await render({ needsClarification: false, controls: controls() });
    expect(container.querySelector("[data-testid=security-clarification-panel]")).toBeNull();
  });
});
