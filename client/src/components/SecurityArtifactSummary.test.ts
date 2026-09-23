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
  metrics: [{ label: "Assets", count: 4 }],
  sections: [
    {
      key: "assets",
      heading: "Asset excerpts",
      showAllLabel: "Show all assets",
      emptyText: "No assets reported.",
      items: ["Asset 1", "Asset 2", "Asset 3", "Asset 4"].map((text) => ({ text })),
    },
    {
      key: "evidence",
      heading: "Evidence excerpts",
      showAllLabel: "Show all evidence",
      emptyText: "No evidence items reported.",
      items: [{ text: "EVID-001 — First statement", detail: "Project brief" }, { text: "EVID-002" }, { text: "EVID-003" }, { text: "EVID-004" }],
    },
    {
      key: "questions",
      heading: "Open questions",
      showAllLabel: "Show all questions",
      emptyText: "No open questions reported.",
      items: [1, 2, 3, 4].map((n) => ({ text: `Question ${n}?` })),
    },
  ],
  nextAction: "Update the project information.",
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

async function render(needsClarification: boolean, value: Summary = summary) {
  await act(async () => root.render(createElement(SecurityArtifactSummary, { summary: value, needsClarification })));
}

function sectionFor(heading: string): HTMLElement {
  const section = [...container.querySelectorAll("[aria-label='Security result summary'] > div")]
    .find((element) => element.querySelector("p")?.textContent === heading);
  expect(section, `Missing section: ${heading}`).toBeDefined();
  return section as HTMLElement;
}

async function clickIn(section: HTMLElement, label: string) {
  const button = [...section.querySelectorAll("button")].find((item) => item.textContent === label);
  expect(button, `Missing button: ${label}`).toBeDefined();
  await act(async () => button!.click());
}

describe("SecurityArtifactSummary", () => {
  it("shows three items, expands all, and collapses again", async () => {
    await render(true);
    const assets = sectionFor("Asset excerpts");
    expect(assets.textContent).toContain("Asset 3");
    expect(assets.textContent).not.toContain("Asset 4");
    expect(assets.textContent).toContain("Show all assets (4)");

    await clickIn(assets, "Show all assets (4)");
    expect(assets.textContent).toContain("Asset 4");
    await clickIn(assets, "Show less");
    expect(assets.textContent).not.toContain("Asset 4");
  });

  it("keeps section expansion independent and shows optional detail", async () => {
    await render(true);
    const assets = sectionFor("Asset excerpts");
    const evidence = sectionFor("Evidence excerpts");
    expect(evidence.textContent).toContain("Project brief");
    await clickIn(assets, "Show all assets (4)");
    expect(assets.textContent).toContain("Asset 4");
    expect(evidence.textContent).not.toContain("EVID-004");
    await clickIn(evidence, "Show all evidence (4)");
    expect(evidence.textContent).toContain("EVID-004");
    await clickIn(assets, "Show less");
    expect(assets.textContent).not.toContain("Asset 4");
    expect(evidence.textContent).toContain("EVID-004");
  });

  it("shows empty states without a toggle and no toggle for up to three items", async () => {
    const value = {
      ...summary,
      sections: [
        { key: "evidence", heading: "Evidence excerpts", showAllLabel: "Show all evidence", emptyText: "No evidence items reported.", items: [] },
        { key: "assets", heading: "Asset excerpts", showAllLabel: "Show all assets", items: [{ text: "Asset 1" }, { text: "Asset 2" }] },
      ],
    };
    await render(false, value);
    expect(sectionFor("Evidence excerpts").textContent).toContain("No evidence items reported.");
    expect(sectionFor("Evidence excerpts").querySelector("button")).toBeNull();
    expect(sectionFor("Asset excerpts").textContent).toContain("Asset 2");
    expect(sectionFor("Asset excerpts").querySelector("button")).toBeNull();
  });

  it("keeps question status wording and uses the same expansion behavior", async () => {
    await render(true);
    const questions = sectionFor("More information needed");
    expect(questions.textContent).toContain("Question 3?");
    expect(questions.textContent).not.toContain("Question 4?");
    await clickIn(questions, "Show all questions (4)");
    expect(questions.textContent).toContain("Question 4?");
    await clickIn(questions, "Show less");
    await render(false);
    const openQuestions = sectionFor("Open questions");
    expect(openQuestions.textContent).toContain("Show all questions (4)");
  });

  it("keeps Advisor guidance and applies independent expandable sections to its lists", async () => {
    const advisor: Summary = {
      ...summary,
      kind: "securityadvisor",
      title: "Recommended next step",
      recommendedNextStep: "Review access controls with the project owner.",
      reason: "Ownership evidence is missing.",
      confidence: "medium",
      sections: [
        { key: "inputs", heading: "Inputs to prepare", showAllLabel: "Show all inputs", items: ["Access policy", "User roles", "Session design", "Review notes"].map((text) => ({ text })) },
        { key: "human-review", heading: "Human review from guidance", showAllLabel: "Show all review items", items: ["Confirm roles", "Check evidence", "Review scope", "Record decision"].map((text) => ({ text })) },
      ],
    };
    await render(false, advisor);
    expect(container.textContent).toContain("Review access controls with the project owner.");
    expect(container.textContent).toContain("Why this step");
    expect(container.textContent).toContain("Confidence: medium");
    const inputs = sectionFor("Inputs to prepare");
    const review = sectionFor("Human review from guidance");
    await clickIn(inputs, "Show all inputs (4)");
    expect(inputs.textContent).toContain("Review notes");
    expect(review.textContent).not.toContain("Record decision");
    await clickIn(review, "Show all review items (4)");
    expect(review.textContent).toContain("Record decision");
  });
});
