/**
 * Pure geometry helpers for drawing rectangular areas on the canvas.
 * Areas are React Flow nodes (type "area", zIndex -1 so they render BELOW
 * boxes) whose bounds come from a drag gesture: `start` is where the mouse
 * went down and `end` where it was released — in flow coordinates.
 */

/** Drags smaller than this (in flow units) are treated as accidental clicks. */
export const MIN_AREA_SIZE = 24;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Normalizes a drag into a top-left anchored rectangle, regardless of the
 * direction the user dragged (left→right, right→left, up→down, down→up).
 */
export function normalizeRect(start: { x: number; y: number }, end: { x: number; y: number }): Rect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

/** True when a rect is big enough to be a deliberate area, not a stray click. */
export function isValidAreaSize(rect: Rect): boolean {
  return rect.width >= MIN_AREA_SIZE && rect.height >= MIN_AREA_SIZE;
}