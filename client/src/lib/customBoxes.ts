/**
 * Custom box definitions — reusable AI box templates a user creates and keeps
 * in their own profile (Firestore `users/{uid}/boxes/{boxId}`). A definition
 * is a template: when added to a board (`addCustomBox` in boardStore) the
 * node is a normal `custom`-type AI box whose prompt/systemPrompt/icon/color
 * are COPIED from the definition, so boards stay self-contained and deleting
 * a saved definition never breaks existing boxes.
 */

export interface CustomBoxDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  /** The AI prompt template — supports {{input_1}} / {{Box Name}} variables. */
  prompt: string;
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
}

/** Emoji options offered in the custom box picker. */
export const CUSTOM_BOX_EMOJIS = [
  "✨", "🚀", "🎯", "📈", "🧠", "💡", "📝", "🎨", "🔧", "🌍",
  "🗣️", "✅", "⚠️", "💰", "📅", "🔍", "🏷️", "⭐", "🔥", "🍀",
  "🎁", "🧪", "📐", "🔔",
];

/** Color options offered in the custom box picker (matches the box palette). */
export const CUSTOM_BOX_COLORS = [
  "#6366f1", // indigo (default)
  "#60a5fa", // blue
  "#a78bfa", // violet
  "#34d399", // emerald
  "#fbbf24", // amber
  "#fb923c", // orange
  "#f472b6", // pink
  "#22d3ee", // cyan
  "#14b8a6", // teal
  "#64748b", // slate
];

export const DEFAULT_CUSTOM_ICON = "✨";
export const DEFAULT_CUSTOM_COLOR = "#6366f1";
export const MAX_CUSTOM_LABEL = 40;

export interface CustomBoxDraft {
  label: string;
  icon: string;
  color: string;
  description: string;
  prompt: string;
  systemPrompt: string;
}

/**
 * Validates a draft before saving. Returns the list of problems (empty =
 * valid). A definition needs a name and a prompt template; everything else
 * falls back to defaults via normalizeCustomBoxDraft.
 */
export function validateCustomBoxDraft(draft: CustomBoxDraft): string[] {
  const errors: string[] = [];
  if (!draft.label.trim()) errors.push("Give your box a name.");
  if (draft.label.trim().length > MAX_CUSTOM_LABEL) {
    errors.push(`Name must be at most ${MAX_CUSTOM_LABEL} characters.`);
  }
  if (!draft.prompt.trim()) errors.push("Add a prompt template (e.g. what the AI should do).");
  return errors;
}

/** Fills in defaults for icon/color/description so saved defs are complete. */
export function normalizeCustomBoxDraft(draft: CustomBoxDraft): CustomBoxDraft {
  const isEmoji = draft.icon && /\p{Extended_Pictographic}/u.test(draft.icon);
  const colorOk = /^#[0-9a-fA-F]{6}$/.test(draft.color);
  return {
    label: draft.label.trim().slice(0, MAX_CUSTOM_LABEL),
    icon: isEmoji ? draft.icon : DEFAULT_CUSTOM_ICON,
    color: colorOk ? draft.color : DEFAULT_CUSTOM_COLOR,
    description: draft.description.trim(),
    prompt: draft.prompt,
    systemPrompt: draft.systemPrompt,
  };
}

/** Sorts definitions by name for a stable palette listing. */
export function sortCustomBoxDefs<T extends { label: string; createdAt: number }>(defs: T[]): T[] {
  return [...defs].sort((a, b) => a.label.localeCompare(b.label));
}