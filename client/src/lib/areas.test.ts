import { describe, expect, it } from "vitest";
import { MIN_AREA_SIZE, isValidAreaSize, normalizeRect } from "./areas.js";

describe("normalizeRect", () => {
  it("anchors top-left for a left→right, up→down drag", () => {
    expect(normalizeRect({ x: 100, y: 100 }, { x: 200, y: 260 })).toEqual({
      x: 100,
      y: 100,
      width: 100,
      height: 160,
    });
  });

  it("normalizes a right→left drag", () => {
    expect(normalizeRect({ x: 300, y: 100 }, { x: 100, y: 260 })).toEqual({
      x: 100,
      y: 100,
      width: 200,
      height: 160,
    });
  });

  it("normalizes a down→up drag", () => {
    expect(normalizeRect({ x: 100, y: 400 }, { x: 200, y: 200 })).toEqual({
      x: 100,
      y: 200,
      width: 100,
      height: 200,
    });
  });

  it("handles a diagonal drag in the opposite corner direction", () => {
    expect(normalizeRect({ x: 500, y: 500 }, { x: 200, y: 100 })).toEqual({
      x: 200,
      y: 100,
      width: 300,
      height: 400,
    });
  });

  it("produces zero size for a click in place", () => {
    expect(normalizeRect({ x: 10, y: 10 }, { x: 10, y: 10 })).toEqual({
      x: 10,
      y: 10,
      width: 0,
      height: 0,
    });
  });
});

describe("isValidAreaSize", () => {
  it("accepts areas at or above the minimum size", () => {
    expect(isValidAreaSize({ x: 0, y: 0, width: MIN_AREA_SIZE, height: MIN_AREA_SIZE })).toBe(true);
    expect(isValidAreaSize({ x: 0, y: 0, width: 400, height: 300 })).toBe(true);
  });

  it("rejects stray clicks and thin drags", () => {
    expect(isValidAreaSize({ x: 0, y: 0, width: 0, height: 0 })).toBe(false);
    expect(isValidAreaSize({ x: 0, y: 0, width: 10, height: 400 })).toBe(false);
    expect(isValidAreaSize({ x: 0, y: 0, width: 400, height: 10 })).toBe(false);
  });
});