// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/react";
import type { CustomBoxDef } from "../lib/customBoxes.js";
import { DEFAULT_BOX_GAP } from "../lib/boxPlacement.js";
import { useBoardStore } from "./boardStore.js";

const customBox: CustomBoxDef = {
  id: "custom-template",
  label: "Custom Review",
  icon: "🔍",
  color: "#123456",
  description: "A custom review box",
  prompt: "Review {{input_1}}",
  systemPrompt: "Review carefully.",
  createdAt: 1,
  updatedAt: 1,
};

function overlapsWithGap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
  gap = DEFAULT_BOX_GAP,
): boolean {
  return !(
    first.x + first.width + gap <= second.x
    || second.x + second.width + gap <= first.x
    || first.y + first.height + gap <= second.y
    || second.y + second.height + gap <= first.y
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  useBoardStore.setState({ nodes: [], edges: [], boxData: {}, currentBoardId: null });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  useBoardStore.setState({ nodes: [], edges: [], boxData: {}, currentBoardId: null });
  localStorage.clear();
});

describe("board store box placement", () => {
  it("uses deterministic, non-overlapping positions for sequential additions", () => {
    const store = useBoardStore.getState();
    const ids = [store.addBox("documents"), store.addBox("assetmapper"), store.addBox("research")];
    const nodes = useBoardStore.getState().nodes.filter((node) => ids.includes(node.id));

    expect(nodes).toHaveLength(3);
    for (let first = 0; first < nodes.length; first += 1) {
      for (let second = first + 1; second < nodes.length; second += 1) {
        const a = nodes[first];
        const b = nodes[second];
        expect(overlapsWithGap(
          { ...a.position, width: Number(a.style?.width), height: Number(a.style?.height) },
          { ...b.position, width: Number(b.style?.width), height: Number(b.style?.height) },
        )).toBe(false);
      }
    }
  });

  it("preserves an explicit position exactly", () => {
    const position = { x: -125.5, y: 87.25 };
    const id = useBoardStore.getState().addBox("idea", position);

    expect(useBoardStore.getState().nodes.find((node) => node.id === id)?.position).toEqual(position);
  });

  it("places additions outside an existing resized node's measured footprint", () => {
    const resizedNode: Node = {
      id: "resized-node",
      type: "idea",
      position: { x: 200, y: 150 },
      measured: { width: 800, height: 500 },
      data: { boxType: "idea" },
    };
    useBoardStore.setState({ nodes: [resizedNode] });

    const id = useBoardStore.getState().addBox("documents");
    const added = useBoardStore.getState().nodes.find((node) => node.id === id)!;

    expect(overlapsWithGap(
      { ...resizedNode.position, width: 800, height: 500 },
      { ...added.position, width: Number(added.style?.width), height: Number(added.style?.height) },
    )).toBe(false);
  });

  it("keeps Chatbot viewport auto-placement intact", () => {
    const store = useBoardStore.getState();
    const id = store.addBox("chatbot");
    expect(useBoardStore.getState().nodes.find((node) => node.id === id)?.data.autoPlace).toBe(true);

    const ordinaryId = useBoardStore.getState().addBox("documents");
    expect(useBoardStore.getState().nodes.find((node) => node.id === ordinaryId)?.position).toEqual({ x: 200, y: 150 });

    const viewportPosition = { x: 740, y: 510 };
    useBoardStore.getState().placeChatbot(id, viewportPosition);

    expect(useBoardStore.getState().nodes.find((node) => node.id === id)).toMatchObject({
      position: viewportPosition,
      data: { autoPlace: false },
    });
  });

  it("applies non-overlapping placement to Custom Boxes", () => {
    useBoardStore.getState().addBox("idea");
    const id = useBoardStore.getState().addCustomBox(customBox);
    const nodes = useBoardStore.getState().nodes;
    const existing = nodes.find((node) => node.type === "idea")!;
    const custom = nodes.find((node) => node.id === id)!;

    expect(overlapsWithGap(
      { ...existing.position, width: Number(existing.style?.width), height: Number(existing.style?.height) },
      { ...custom.position, width: Number(custom.style?.width), height: Number(custom.style?.height) },
    )).toBe(false);
  });

  it("preserves an explicit Custom Box position exactly", () => {
    const position = { x: 123, y: 456 };
    const id = useBoardStore.getState().addCustomBox(customBox, position);

    expect(useBoardStore.getState().nodes.find((node) => node.id === id)?.position).toEqual(position);
  });
});
