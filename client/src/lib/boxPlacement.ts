import { BOX_TYPES, type BoxType } from "../types.js";

export const DEFAULT_BOX_GAP = 32;

const PLACEMENT_COLUMNS = 5;

export interface BoxPlacementNode {
  type?: string | null;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  measured?: { width?: number; height?: number };
  style?: { width?: number | string; height?: number | string };
  data?: { boxType?: unknown; autoPlace?: unknown };
}

interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function numericDimension(value: number | string | undefined): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : undefined;
  if (typeof value !== "string" || !/^\s*\d+(?:\.\d+)?(?:px)?\s*$/.test(value)) return undefined;
  const dimension = Number.parseFloat(value);
  return Number.isFinite(dimension) && dimension > 0 ? dimension : undefined;
}

function nodeBoxType(node: BoxPlacementNode): BoxType {
  const candidate = node.type || node.data?.boxType;
  return typeof candidate === "string" && Object.hasOwn(BOX_TYPES, candidate)
    ? candidate as BoxType
    : "custom";
}

function nodeRect(node: BoxPlacementNode): BoxRect | null {
  if (
    node.type === "area"
    || (node.type === "chatbot" && node.data?.autoPlace === true)
    || !Number.isFinite(node.position?.x)
    || !Number.isFinite(node.position?.y)
  ) {
    return null;
  }

  const defaults = BOX_TYPES[nodeBoxType(node)];
  const width = numericDimension(node.measured?.width)
    ?? numericDimension(node.width)
    ?? numericDimension(node.style?.width)
    ?? defaults.defaultWidth;
  const height = numericDimension(node.measured?.height)
    ?? numericDimension(node.height)
    ?? numericDimension(node.style?.height)
    ?? defaults.defaultHeight;

  return { x: node.position.x, y: node.position.y, width, height };
}

function overlapsWithGap(candidate: BoxRect, existing: BoxRect): boolean {
  return !(
    candidate.x + candidate.width + DEFAULT_BOX_GAP <= existing.x
    || existing.x + existing.width + DEFAULT_BOX_GAP <= candidate.x
    || candidate.y + candidate.height + DEFAULT_BOX_GAP <= existing.y
    || existing.y + existing.height + DEFAULT_BOX_GAP <= candidate.y
  );
}

export function findAvailableBoxPosition({
  existingNodes,
  width,
  height,
  preferredOrigin = { x: 200, y: 150 },
}: {
  existingNodes: readonly BoxPlacementNode[];
  width: number;
  height: number;
  preferredOrigin?: { x: number; y: number };
}): { x: number; y: number } {
  const safeWidth = numericDimension(width) ?? BOX_TYPES.custom.defaultWidth;
  const safeHeight = numericDimension(height) ?? BOX_TYPES.custom.defaultHeight;
  const boxes = existingNodes.map(nodeRect).filter((rect): rect is BoxRect => rect !== null);
  const rowStep = safeHeight + DEFAULT_BOX_GAP;
  const columnStep = safeWidth + DEFAULT_BOX_GAP;
  const maxBlockedRow = boxes.reduce((maximum, box) => Math.max(
    maximum,
    Math.ceil((box.y + box.height + DEFAULT_BOX_GAP - preferredOrigin.y) / rowStep),
  ), 0);
  const maxRows = Math.max(maxBlockedRow + 1, boxes.length + 1);

  for (let row = 0; row < maxRows; row += 1) {
    for (let column = 0; column < PLACEMENT_COLUMNS; column += 1) {
      const candidate = {
        x: preferredOrigin.x + column * columnStep,
        y: preferredOrigin.y + row * rowStep,
        width: safeWidth,
        height: safeHeight,
      };
      if (boxes.every((box) => !overlapsWithGap(candidate, box))) {
        return { x: candidate.x, y: candidate.y };
      }
    }
  }

  return {
    x: preferredOrigin.x,
    y: preferredOrigin.y + maxRows * rowStep,
  };
}
