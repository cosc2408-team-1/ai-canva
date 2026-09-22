import { describe, expect, it } from "vitest";
import { BOX_TYPES, type BoxType } from "../types.js";
import AreaNode from "./AreaNode.js";
import BoxNode from "./BoxNode.js";
import {
  NODE_TYPES,
  resolveMiniMapNodeColor,
  UNKNOWN_MINIMAP_NODE_COLOR,
} from "./Canvas.js";

describe("Canvas box registrations", () => {
  it("registers every normal BoxType with BoxNode and keeps Area special", () => {
    for (const type of Object.keys(BOX_TYPES) as BoxType[]) {
      expect(NODE_TYPES[type]).toBe(BoxNode);
    }
    expect(NODE_TYPES.area).toBe(AreaNode);
  });
});

describe("MiniMap node colours", () => {
  it.each(["idea", "assetmapper", "reqelicitor"] as const)("uses %s colour from BOX_TYPES", (type) => {
    expect(resolveMiniMapNodeColor({ type, data: {} })).toBe(BOX_TYPES[type].color);
  });

  it("keeps custom, area, and unknown fallbacks safe", () => {
    expect(resolveMiniMapNodeColor({ type: "custom", data: { customColor: "#123456" } })).toBe("#123456");
    expect(resolveMiniMapNodeColor({ type: "custom", data: {} })).toBe(BOX_TYPES.custom.color);
    expect(resolveMiniMapNodeColor({ type: "area", data: { border: "#654321" } })).toBe("#654321");
    expect(resolveMiniMapNodeColor({ type: "unknown", data: {} })).toBe(UNKNOWN_MINIMAP_NODE_COLOR);
  });
});
