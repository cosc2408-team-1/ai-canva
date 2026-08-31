import { describe, expect, it } from "vitest";
import { fillPromptTemplate, getBoxOutput } from "./prompts.js";

const namedInputs = [
  { name: "Research", output: "  Findings about AI.  " },
  { name: "Idea", output: "Build an agent." },
];

describe("fillPromptTemplate", () => {
  it("fills {{inputs}} with all named inputs", () => {
    const out = fillPromptTemplate("Here: {{inputs}}", namedInputs);
    expect(out).toContain("Research:\nFindings about AI.");
    expect(out).toContain("Idea:\nBuild an agent.");
    expect(out).not.toContain("{{inputs}}");
  });

  it("reports '[no inputs]' for {{inputs}} with no inputs", () => {
    expect(fillPromptTemplate("{{inputs}}", [])).toContain("[no inputs]");
  });

  it("fills {{input}} as the first input and {{input_N}} positionally", () => {
    expect(fillPromptTemplate("{{input}}", namedInputs)).toBe("Findings about AI.");
    expect(fillPromptTemplate("{{input_2}}", namedInputs)).toBe("Build an agent.");
  });

  it("leaves unknown positional inputs as '[no input]'", () => {
    expect(fillPromptTemplate("{{input_9}}", namedInputs)).toContain("[no input]");
  });

  it("matches {{Box Name}} case-insensitively by box name", () => {
    expect(fillPromptTemplate("{{research}}", namedInputs)).toBe("Findings about AI.");
    expect(fillPromptTemplate("{{IDEA}}", namedInputs)).toBe("Build an agent.");
  });

  it("keeps unresolved named variables as-is", () => {
    const template = "{{Missing Box}}";
    expect(fillPromptTemplate(template, namedInputs)).toBe(template);
  });
});

describe("getBoxOutput", () => {
  it("prefers generated output over user content", () => {
    expect(getBoxOutput("generated", "typed")).toBe("generated");
  });
  it("falls back to user content when no output exists", () => {
    expect(getBoxOutput("", "typed")).toBe("typed");
  });
});
