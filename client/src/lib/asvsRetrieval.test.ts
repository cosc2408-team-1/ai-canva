import { describe, expect, it } from "vitest";
import { ASVS_REQUIREMENTS, ASVS_VERSION } from "./asvsData.js";
import {
  asvsReferencePrompt,
  findAsvsIds,
  isKnownAsvsId,
  queryTerms,
  retrieveAsvsRequirements,
  tokenize,
} from "./asvsRetrieval.js";
import { JENNIE_PROJECT_DESCRIPTION } from "./boardTemplates.js";

describe("ASVS 5.0.0 data", () => {
  it("contains the full requirement list with unique, version-prefixed IDs", () => {
    expect(ASVS_VERSION).toBe("5.0.0");
    expect(ASVS_REQUIREMENTS).toHaveLength(345);
    const ids = ASVS_REQUIREMENTS.map((requirement) => requirement.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const requirement of ASVS_REQUIREMENTS) {
      expect(requirement.id).toMatch(/^v5\.0\.0-\d+\.\d+\.\d+$/);
      expect(requirement.text).toMatch(/^Verify /);
      expect([1, 2, 3]).toContain(requirement.level);
    }
  });
});

describe("tokenize", () => {
  it("normalises sign-in phrases, folds plurals and drops stopwords and artifact field names", () => {
    expect(tokenize("Students sign in and upload files")).toEqual(["student", "signin", "upload", "file"]);
    expect(tokenize("evidence_register: status complete")).toEqual([]);
    expect(tokenize("access analysis status")).toEqual(["access", "analysis"]);
  });
});

describe("queryTerms", () => {
  it("adds related ASVS words so project language can match the standard", () => {
    expect([...queryTerms("Students sign in and upload files")]).toEqual([
      "student", "signin", "authentication", "login", "credential", "upload", "file", "content",
    ]);
  });

  it("adds each related word once and leaves unknown words alone", () => {
    const terms = queryTerms("sign in and log in to the portal");
    expect([...terms].filter((term) => term === "authentication")).toHaveLength(1);
    expect(terms.has("portal")).toBe(true);
  });
});

describe("retrieveAsvsRequirements", () => {
  it("finds file upload, authentication and authorization requirements for the Jennie scenario", () => {
    const matches = retrieveAsvsRequirements(JENNIE_PROJECT_DESCRIPTION);
    expect(matches).toHaveLength(8);
    const chapters = new Set(matches.map(({ requirement }) => requirement.chapter));
    expect(chapters).toContain("File Handling");
    expect(chapters).toContain("Authorization");
    expect([...chapters].some((chapter) => chapter === "Authentication" || chapter === "OAuth and OIDC")).toBe(true);
    const scores = matches.map(({ score }) => score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("returns nothing for text with no web application signal", () => {
    expect(retrieveAsvsRequirements("A warehouse forklift maintenance schedule kept on paper.")).toEqual([]);
    expect(retrieveAsvsRequirements("")).toEqual([]);
  });

  it("is deterministic and respects the limit", () => {
    const first = retrieveAsvsRequirements(JENNIE_PROJECT_DESCRIPTION, 3).map(({ requirement }) => requirement.id);
    const second = retrieveAsvsRequirements(JENNIE_PROJECT_DESCRIPTION, 3).map(({ requirement }) => requirement.id);
    expect(first).toHaveLength(3);
    expect(second).toEqual(first);
    expect(retrieveAsvsRequirements(JENNIE_PROJECT_DESCRIPTION, 0)).toEqual([]);
  });
});

describe("asvsReferencePrompt", () => {
  it("lists only real ASVS IDs and tells the model to cite only those", () => {
    const block = asvsReferencePrompt(JENNIE_PROJECT_DESCRIPTION);
    expect(block).toContain("Retrieved OWASP ASVS 5.0.0 reference requirements");
    expect(block).toContain("reference material, not project evidence");
    expect(block).toContain("cite only IDs from this list");
    const ids = findAsvsIds(block);
    expect(ids).toHaveLength(8);
    expect(ids.every(isKnownAsvsId)).toBe(true);
  });

  it("adds nothing when no requirement is relevant", () => {
    expect(asvsReferencePrompt("A warehouse forklift maintenance schedule kept on paper.")).toBe("");
  });
});

describe("ASVS ID helpers", () => {
  it("recognises real IDs and rejects invented ones", () => {
    expect(isKnownAsvsId("v5.0.0-1.1.1")).toBe(true);
    expect(isKnownAsvsId("v5.0.0-99.9.9")).toBe(false);
    expect(isKnownAsvsId("V1.1.1")).toBe(false);
  });

  it("finds each version-prefixed ID once", () => {
    expect(findAsvsIds("see v5.0.0-6.2.1 and v5.0.0-6.2.1, also v4.0.3-2.1.1 and v5.0.0-5.2.2."))
      .toEqual(["v5.0.0-6.2.1", "v5.0.0-5.2.2"]);
  });
});
