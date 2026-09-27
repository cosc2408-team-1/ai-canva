import { describe, expect, it } from "vitest";
import { queryTerms, retrieveAsvsRequirements, tokenize } from "./asvsRetrieval.js";
import { JENNIE_PROJECT_DESCRIPTION } from "./boardTemplates.js";

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
