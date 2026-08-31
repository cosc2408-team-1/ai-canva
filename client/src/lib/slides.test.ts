import { describe, expect, it } from "vitest";
import { parseSlidesResponse } from "./slides.js";

describe("parseSlidesResponse", () => {
  it("parses a plain JSON array of slides", () => {
    const text = JSON.stringify([
      { title: "Problem", bullets: ["A", "B"] },
      { title: "Solution", bullets: ["C"], notes: "say this" },
    ]);
    expect(parseSlidesResponse(text)).toEqual([
      { title: "Problem", bullets: ["A", "B"], notes: undefined },
      { title: "Solution", bullets: ["C"], notes: "say this" },
    ]);
  });

  it("strips a markdown ```json fence", () => {
    const text = '```json\n[{"title":"T","bullets":["x"]}]\n```';
    expect(parseSlidesResponse(text)).toEqual([
      { title: "T", bullets: ["x"], notes: undefined },
    ]);
  });

  it("extracts the array from surrounding prose", () => {
    const text = 'Here is the deck:\n[{"title":"Only","bullets":[]}]\nEnjoy';
    expect(parseSlidesResponse(text)).toHaveLength(1);
  });

  it("drops items without a string title", () => {
    const text = JSON.stringify([{ bullets: [] }, { title: "Good", bullets: [] }]);
    expect(parseSlidesResponse(text)).toEqual([
      { title: "Good", bullets: [], notes: undefined },
    ]);
  });

  it("coerces non-string bullets to strings", () => {
    const text = JSON.stringify([{ title: "T", bullets: [1, "two"] }]);
    expect(parseSlidesResponse(text)).toEqual([
      { title: "T", bullets: ["1", "two"], notes: undefined },
    ]);
  });

  it("throws a helpful error when no JSON array is present", () => {
    expect(() => parseSlidesResponse("Sorry, I could not do that.")).toThrow(
      /Could not parse slides from AI response/
    );
  });
});
