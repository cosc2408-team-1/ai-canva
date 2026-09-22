import { describe, expect, it } from "vitest";
import {
  calculateIdeaNodeHeight,
  IDEA_NODE_MAX_AUTO_HEIGHT,
  IDEA_NODE_MIN_HEIGHT,
} from "./ideaSizing.js";

describe("Idea node sizing", () => {
  it("keeps very small content at the minimum height", () => {
    expect(calculateIdeaNodeHeight(20)).toBe(IDEA_NODE_MIN_HEIGHT);
  });

  it("grows for normal textarea content", () => {
    expect(calculateIdeaNodeHeight(180)).toBe(280);
  });

  it("caps large content at the maximum automatic height", () => {
    expect(calculateIdeaNodeHeight(900)).toBe(IDEA_NODE_MAX_AUTO_HEIGHT);
  });

  it("never returns outside the configured bounds", () => {
    for (const contentHeight of [-50, 0, 60, 200, 1000]) {
      const height = calculateIdeaNodeHeight(contentHeight);
      expect(height).toBeGreaterThanOrEqual(IDEA_NODE_MIN_HEIGHT);
      expect(height).toBeLessThanOrEqual(IDEA_NODE_MAX_AUTO_HEIGHT);
    }
  });

  it("can shrink again when measured content becomes smaller", () => {
    expect(calculateIdeaNodeHeight(140)).toBeLessThan(calculateIdeaNodeHeight(300));
  });
});
