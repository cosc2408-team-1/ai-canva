// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SecurityArtifactSummary as Summary } from "../lib/securityArtifactSummary.js";
import SecurityArtifactSummary from "./SecurityArtifactSummary.js";

const summary: Summary = {
  kind: "assetmapper",
  sourceStatus: "clarification_required",
  title: "Assets discovered",
  description: "Based on supplied information.",
  metrics: [],
  examples: ["Asset 1", "Asset 2", "Asset 3", "Asset 4", "Asset 5"],
  sections: [{
    heading: "Evidence excerpts",
    items: [
      { text: "EVID-001 — First statement", detail: "Project brief" },
      { text: "EVID-002 — Second statement" },
      { text: "EVID-003 — Third statement" },
      { text: "EVID-004 — Fourth statement" },
    ],
  }],
  clarificationItems: [1, 2, 3, 4, 5].map((n) => ({ text: `Question ${n}?` })),
  inputsToPrepare: [],
  humanReview: [],
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

async function render(needsClarification: boolean) {
  await act(async () => root.render(createElement(SecurityArtifactSummary, { summary, needsClarification })));
}

async function click(label: string) {
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent === label);
  expect(button, `Missing button: ${label}`).toBeDefined();
  await act(async () => button!.click());
}

describe("SecurityArtifactSummary", () => {
  it("shows three ordered excerpts, optional detail, and Technical artifact overflow", async () => {
    await render(true);
    expect(container.textContent).toContain("Evidence excerpts");
    expect(container.textContent).toContain("EVID-001 — First statement");
    expect(container.textContent).toContain("Project brief");
    expect(container.textContent).toContain("EVID-003 — Third statement");
    expect(container.textContent).not.toContain("EVID-004 — Fourth statement");
    expect(container.textContent).toContain("+ 1 more in Technical artifact");
    expect(container.querySelectorAll("section ul")[1]?.children).toHaveLength(3);
  });

  it("shows three assets by default and expands and collapses all asset names", async () => {
    await render(true);
    expect(container.textContent).toContain("Asset 3");
    expect(container.textContent).not.toContain("Asset 4");
    expect(container.textContent).toContain("Show all assets (5)");

    await click("Show all assets (5)");
    expect(container.textContent).toContain("Asset 5");
    expect(container.textContent).toContain("Show less");

    await click("Show less");
    expect(container.textContent).not.toContain("Asset 4");
    expect(container.textContent).toContain("Show all assets (5)");
  });

  it("shows clarification questions, initially three, with expansion controls", async () => {
    await render(true);
    expect(container.textContent).toContain("More information needed");
    expect(container.textContent).toContain("Question 3?");
    expect(container.textContent).not.toContain("Question 4?");
    expect(container.textContent).toContain("Show all questions (5)");

    await click("Show all questions (5)");
    expect(container.textContent).toContain("Question 5?");
    await click("Show less");
    expect(container.textContent).not.toContain("Question 4?");
  });

  it("shows open questions even when validation is otherwise valid", async () => {
    await render(false);
    expect(container.textContent).toContain("Open questions");
    expect(container.textContent).toContain("Question 3?");
    expect(container.textContent).not.toContain("Question 4?");
    await click("Show all questions (5)");
    expect(container.textContent).toContain("Question 5?");
  });
});
