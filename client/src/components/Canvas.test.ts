import { describe, expect, it } from "vitest";
import { MINIMAP_NODE_COLORS, NODE_TYPES } from "./Canvas.js";

describe("Canvas box registrations", () => {
  it("renders Asset Mapper with the standard BoxNode and its metadata colour", () => {
    expect(NODE_TYPES.assetmapper).toBeDefined();
    expect(MINIMAP_NODE_COLORS.assetmapper).toBe("#0891b2");
  });
});
