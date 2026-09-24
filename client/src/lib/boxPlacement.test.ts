import { describe, expect, it } from "vitest";
import { DEFAULT_BOX_GAP, findAvailableBoxPosition, type BoxPlacementNode } from "./boxPlacement.js";

const origin = { x: 200, y: 150 };

function intersectsWithGap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    first.x + first.width + DEFAULT_BOX_GAP <= second.x
    || second.x + second.width + DEFAULT_BOX_GAP <= first.x
    || first.y + first.height + DEFAULT_BOX_GAP <= second.y
    || second.y + second.height + DEFAULT_BOX_GAP <= first.y
  );
}

describe("default Box placement", () => {
  it("uses the preferred origin when no ordinary Box blocks it", () => {
    expect(findAvailableBoxPosition({
      existingNodes: [],
      width: 320,
      height: 200,
    })).toEqual(origin);
  });

  it("moves to the next deterministic column with an exact 32px gap", () => {
    const position = findAvailableBoxPosition({
      existingNodes: [{ type: "idea", position: origin }],
      width: 320,
      height: 200,
      preferredOrigin: origin,
    });

    expect(position).toEqual({ x: 552, y: 150 });
    expect(position.x - (origin.x + 320)).toBe(DEFAULT_BOX_GAP);
  });

  it("places sequential additions deterministically without reducing the gap", () => {
    const findSequence = () => {
      const boxes: Array<BoxPlacementNode & { width: number; height: number }> = [];

      for (let index = 0; index < 4; index += 1) {
        const position = findAvailableBoxPosition({
          existingNodes: boxes,
          width: 220,
          height: 120,
          preferredOrigin: origin,
        });
        const added = { type: "research", position, width: 220, height: 120 };
        expect(boxes.every((box) => !intersectsWithGap(
          { ...position, width: added.width, height: added.height },
          { ...box.position, width: box.width, height: box.height },
        ))).toBe(true);
        boxes.push(added);
      }

      return boxes.map(({ position }) => position);
    };

    const firstRun = findSequence();
    expect(findSequence()).toEqual(firstRun);
    expect(new Set(firstRun.map(({ x, y }) => `${x},${y}`)).size).toBe(4);
  });

  it("uses independently resolved measured width and style height for resized nodes", () => {
    const position = findAvailableBoxPosition({
      existingNodes: [{
        type: "custom",
        position: origin,
        measured: { width: 1800 },
        style: { height: 300 },
      }],
      width: 200,
      height: 100,
      preferredOrigin: origin,
    });

    expect(position).toEqual({ x: 200, y: 546 });
  });

  it("uses the canonical BoxType dimensions when rendered dimensions are absent", () => {
    const position = findAvailableBoxPosition({
      existingNodes: [{ type: "idea", position: origin }],
      width: 200,
      height: 100,
      preferredOrigin: origin,
    });

    expect(position).toEqual({ x: 664, y: 150 });
  });

  it("ignores Area nodes for collision blocking", () => {
    expect(findAvailableBoxPosition({
      existingNodes: [{
        type: "area",
        position: origin,
        style: { width: 2000, height: 2000 },
      }],
      width: 320,
      height: 200,
      preferredOrigin: origin,
    })).toEqual(origin);
  });

  it("ignores a pending Chatbot until Canvas positions it", () => {
    expect(findAvailableBoxPosition({
      existingNodes: [{
        type: "chatbot",
        position: origin,
        style: { width: 2000, height: 2000 },
        data: { autoPlace: true },
      }],
      width: 320,
      height: 200,
      preferredOrigin: origin,
    })).toEqual(origin);
  });
});
