import { describe, expect, it } from "vitest";
import { queryTerms, tokenize } from "./asvsRetrieval.js";

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
