// Reads the prompts the app ships today, so `run.mjs --app` never evaluates a stale copy.
// client/src/types.ts has no imports; Node 22.18+ loads it directly by stripping types.
// Read-only: nothing here calls the app, its APIs or Firebase.
import { BOX_IDS } from './score.mjs';

export async function loadAppPrompts() {
  const { BOX_TYPES } = await import('../client/src/types.ts');
  return BOX_IDS.map(id => {
    const box = BOX_TYPES?.[id];
    if (!box || typeof box.defaultSystemPrompt !== 'string' || typeof box.defaultPrompt !== 'string') {
      throw new Error(`client/src/types.ts has no prompts for box "${id}"`);
    }
    // The app fills {{inputs}} with the connected boxes' output; the runner fills {{input}}
    // with the scenario input. Anything else would be left unfilled, so refuse it.
    const placeholders = box.defaultPrompt.match(/{{[^}]*}}/g) ?? [];
    if (placeholders.length !== 1 || placeholders[0] !== '{{inputs}}') {
      throw new Error(`The ${id} defaultPrompt must contain exactly one {{inputs}} and no other placeholders`);
    }
    return {
      id,
      label: box.label,
      system: box.defaultSystemPrompt,
      user_template: box.defaultPrompt.replace('{{inputs}}', '{{input}}'),
    };
  });
}
