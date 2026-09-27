import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import type { SecurityClarification } from "../types.js";
import {
  MAX_CLARIFICATIONS,
  MAX_CLARIFICATION_ANSWER_CHARS,
  buildClarificationInput,
  clarificationBypassPrompt,
  clarificationKey,
  clarificationOverrideActive,
  extractClarificationQuestions,
  mergeClarificationAnswers,
  upsertClarifications,
} from "./securityClarifications.js";

const elicitor = `artifact_type: RequirementsPackage
schema_version: "1.0"
status: clarification_required
open_questions:
  - question: Is MFA enforced for administrators?
    why_it_matters: Decides whether privileged access is protected.
  - Where are logs stored?
  - "  where are   LOGS stored?  "`;

const advisor = `artifact_type: NextStepGuidance
schema_version: "1.0"
status: interview_required
focused_questions:
  - question: What decision are you trying to make?
    why_it_matters: Changes the recommended route.
    evidence_needed: The release decision owner.`;

function entry(overrides: Partial<SecurityClarification> = {}): SecurityClarification {
  return {
    key: clarificationKey("Where are logs stored?"),
    question: "Where are logs stored?",
    whyItMatters: "",
    answer: "Firebase defaults only.",
    answeredBy: "Ana",
    answeredAt: 10,
    round: 1,
    source: "user",
    ...overrides,
  };
}

describe("extractClarificationQuestions", () => {
  it("reads open_questions (objects and strings) and dedupes by normalized text", () => {
    const questions = extractClarificationQuestions("reqelicitor", elicitor);
    expect(questions).toEqual([
      {
        key: "is mfa enforced for administrators?",
        question: "Is MFA enforced for administrators?",
        whyItMatters: "Decides whether privileged access is protected.",
        evidenceNeeded: "",
      },
      { key: "where are logs stored?", question: "Where are logs stored?", whyItMatters: "", evidenceNeeded: "" },
    ]);
  });

  it("reads the Advisor's focused_questions with evidence_needed", () => {
    const [question] = extractClarificationQuestions("securityadvisor", advisor);
    expect(question.question).toBe("What decision are you trying to make?");
    expect(question.evidenceNeeded).toBe("The release decision owner.");
  });

  it("returns nothing for malformed YAML", () => {
    expect(extractClarificationQuestions("reqelicitor", "status: [unclosed")).toEqual([]);
  });
});

describe("mergeClarificationAnswers", () => {
  const questions = extractClarificationQuestions("reqelicitor", elicitor);

  it("stores only answered questions, attributed and fully defined", () => {
    const merged = mergeClarificationAnswers(undefined, questions, { "is mfa enforced for administrators?": "  Planned, untested  " }, "Ana", 50);
    expect(merged).toEqual([{
      key: "is mfa enforced for administrators?",
      question: "Is MFA enforced for administrators?",
      whyItMatters: "Decides whether privileged access is protected.",
      answer: "Planned, untested",
      answeredBy: "Ana",
      answeredAt: 50,
      round: 1,
      source: "user",
    }]);
    for (const value of Object.values(merged[0])) expect(value).not.toBeUndefined();
  });

  it("returns the same array when nothing changed", () => {
    const existing = [entry()];
    expect(mergeClarificationAnswers(existing, questions, {}, "Ben", 99)).toBe(existing);
    expect(mergeClarificationAnswers(existing, questions, { [existing[0].key]: "Firebase defaults only." }, "Ben", 99)).toBe(existing);
  });

  it("keeps earlier-round answers that are no longer asked, and removes blanked ones", () => {
    const old = entry({ key: "who owns the data?", question: "Who owns the data?", answer: "The registrar." });
    const stored = [old];
    const kept = mergeClarificationAnswers(stored, questions, {}, "Ben", 99);
    expect(kept).toBe(stored);
    expect(kept.map((item) => item.key)).toEqual(["who owns the data?"]);
    expect(mergeClarificationAnswers([old], questions, { "who owns the data?": "  " }, "Ben", 99)).toEqual([]);
  });

  it("re-attributes an edited answer, keeps its round, and numbers new rounds", () => {
    const merged = mergeClarificationAnswers([entry()], questions, {
      "where are logs stored?": "Central SIEM.",
      "is mfa enforced for administrators?": "unknown",
    }, "Ben", 99);
    expect(merged[0]).toMatchObject({ answer: "Central SIEM.", answeredBy: "Ben", answeredAt: 99, round: 1 });
    expect(merged[1]).toMatchObject({ answer: "unknown", round: 2 });
  });

  it("caps answer length and entry count", () => {
    const long = mergeClarificationAnswers(undefined, questions, { "where are logs stored?": "x".repeat(5000) }, "Ana", 1);
    expect(long[0].answer).toHaveLength(MAX_CLARIFICATION_ANSWER_CHARS);
    const many = Array.from({ length: MAX_CLARIFICATIONS + 5 }, (_, index) => entry({ key: `q${index}`, question: `Q${index}?` }));
    expect(mergeClarificationAnswers(many, [], { q0: "changed" }, "Ana", 1)).toHaveLength(MAX_CLARIFICATIONS);
  });
});

describe("upsertClarifications", () => {
  it("replaces entries by key without duplicating, keeping others", () => {
    const user = entry({ key: "other", question: "Other?" });
    const scripted = entry({ source: "demo-script", answer: "Scripted." });
    const once = upsertClarifications([user], [scripted]);
    expect(once).toEqual([user, scripted]);
    const twice = upsertClarifications(once, [{ ...scripted, answeredAt: 999 }]);
    expect(twice).toBe(once);
  });
});

describe("buildClarificationInput", () => {
  it("returns null without answers", () => {
    expect(buildClarificationInput(undefined)).toBeNull();
    expect(buildClarificationInput([entry({ answer: " " })])).toBeNull();
  });

  it("carries its own instructions and safely escaped YAML", () => {
    const tricky = entry({ question: "Key: value # comment?", answer: "Line one\nstatus: complete" });
    const input = buildClarificationInput([tricky])!;
    expect(input).toContain("user_reported evidence");
    expect(input).toContain("Do not re-ask");
    const yaml = input.slice(input.indexOf("questions_and_answers:"));
    expect(parse(yaml)).toEqual({ questions_and_answers: [{ question: tricky.question, answer: tricky.answer }] });
  });
});

describe("override and bypass note", () => {
  it("counts an override only for the exact validated output", () => {
    const override = { by: "Ana", at: 1, validatedAt: 42 };
    expect(clarificationOverrideActive(override, { validatedAt: 42 })).toBe(true);
    expect(clarificationOverrideActive(override, { validatedAt: 43 })).toBe(false);
    expect(clarificationOverrideActive(undefined, { validatedAt: 42 })).toBe(false);
  });

  it("names bypassed sources and forbids treating unknowns as not implemented", () => {
    expect(clarificationBypassPrompt([])).toBe("");
    const note = clarificationBypassPrompt(["Requirements Elicitor"]);
    expect(note).toContain("Requirements Elicitor still has status clarification_required");
    expect(note).toContain("never not_implemented");
    expect(note).toContain("limitations");
  });
});
