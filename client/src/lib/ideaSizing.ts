export const IDEA_NODE_MIN_HEIGHT = 200;
export const IDEA_NODE_MAX_AUTO_HEIGHT = 480;
export const IDEA_NODE_CHROME_HEIGHT = 100;
export const IDEA_TEXTAREA_MIN_HEIGHT = 100;

/** Calculates a persisted Idea node height from its textarea content height. */
export function calculateIdeaNodeHeight(
  contentHeight: number,
  chromeHeight = IDEA_NODE_CHROME_HEIGHT,
): number {
  const requiredHeight = Math.ceil(Math.max(0, contentHeight) + Math.max(0, chromeHeight));
  return Math.min(IDEA_NODE_MAX_AUTO_HEIGHT, Math.max(IDEA_NODE_MIN_HEIGHT, requiredHeight));
}

/** Caps the textarea at the body space available inside the auto-sized node. */
export function calculateIdeaTextareaHeight(contentHeight: number): number {
  const maxTextareaHeight = IDEA_NODE_MAX_AUTO_HEIGHT - IDEA_NODE_CHROME_HEIGHT;
  return Math.min(maxTextareaHeight, Math.max(IDEA_TEXTAREA_MIN_HEIGHT, Math.ceil(contentHeight)));
}
