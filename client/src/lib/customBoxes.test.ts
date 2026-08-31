import { describe, expect, it } from "vitest";
import {
  DEFAULT_CUSTOM_COLOR,
  DEFAULT_CUSTOM_ICON,
  normalizeCustomBoxDraft,
  sortCustomBoxDefs,
  validateCustomBoxDraft,
  type CustomBoxDraft,
} from "./customBoxes.js";

const draft = (over: Partial<CustomBoxDraft> = {}): CustomBoxDraft => ({
  label: "Translate to French",
  icon: "🌍",
  color: "#60a5fa",
  description: "Translates input to French",
  prompt: "Translate the following to French:\n\n{{input_1}}",
  systemPrompt: "You are a professional translator.",
  ...over,
});

describe("validateCustomBoxDraft", () => {
  it("accepts a complete draft", () => {
    expect(validateCustomBoxDraft(draft())).toEqual([]);
  });

  it("requires a name", () => {
    expect(validateCustomBoxDraft(draft({ label: "  " }))).toContain("Give your box a name.");
  });

  it("requires a prompt template", () => {
    expect(validateCustomBoxDraft(draft({ prompt: "" }))).toContain(
      "Add a prompt template (e.g. what the AI should do)."
    );
  });

  it("rejects over-long names", () => {
    expect(validateCustomBoxDraft(draft({ label: "x".repeat(41) }))).toContain(
      "Name must be at most 40 characters."
    );
  });
});

describe("normalizeCustomBoxDraft", () => {
  it("keeps a valid draft intact", () => {
    const n = normalizeCustomBoxDraft(draft());
    expect(n.label).toBe("Translate to French");
    expect(n.icon).toBe("🌍");
    expect(n.color).toBe("#60a5fa");
  });

  it("falls back to the default icon for non-emoji input", () => {
    expect(normalizeCustomBoxDraft(draft({ icon: "nope" })).icon).toBe(DEFAULT_CUSTOM_ICON);
    expect(normalizeCustomBoxDraft(draft({ icon: "" })).icon).toBe(DEFAULT_CUSTOM_ICON);
  });

  it("falls back to the default color for invalid hex", () => {
    expect(normalizeCustomBoxDraft(draft({ color: "red" })).color).toBe(DEFAULT_CUSTOM_COLOR);
    expect(normalizeCustomBoxDraft(draft({ color: "#12" })).color).toBe(DEFAULT_CUSTOM_COLOR);
  });

  it("trims the label and caps its length", () => {
    expect(normalizeCustomBoxDraft(draft({ label: "  Hello  " })).label).toBe("Hello");
    expect(normalizeCustomBoxDraft(draft({ label: "x".repeat(99) })).label).toHaveLength(40);
  });
});

describe("sortCustomBoxDefs", () => {
  it("sorts definitions alphabetically by name", () => {
    const sorted = sortCustomBoxDefs([
      { label: "Zeta", createdAt: 3 },
      { label: "alpha", createdAt: 1 },
      { label: "Beta", createdAt: 2 },
    ]);
    expect(sorted.map((d) => d.label)).toEqual(["alpha", "Beta", "Zeta"]);
  });
});