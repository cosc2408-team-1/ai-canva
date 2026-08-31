import { stitch } from "@google/stitch-sdk";

let _projectId: string | null = null;

// Keep Stitch generation quick and reliable. GEMINI_3_FLASH is significantly
// faster than the PRO model and is plenty for UI-screen generation.
const STITCH_MODEL =
  (process.env.STITCH_MODEL as "GEMINI_3_PRO" | "GEMINI_3_FLASH") ||
  "GEMINI_3_FLASH";

// Cap the prompt so real pipelines (e.g. a whole Research box via {{inputs}})
// don't make Stitch time out or return a written spec instead of a UI screen.
const MAX_PROMPT_CHARS = 6000;

/**
 * Generates a UI screen from a text prompt using Google Stitch.
 * Returns the HTML content and a screenshot URL.
 */
export async function generateStitchUI(
  prompt: string
): Promise<{ html: string; imageUrl: string }> {
  const apiKey = process.env.STITCH_API_KEY;
  if (!apiKey) {
    throw new Error("STITCH_API_KEY is not configured.");
  }

  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    throw new Error("No prompt provided. Type a description or connect an input.");
  }
  const shortPrompt =
    trimmed.length > MAX_PROMPT_CHARS
      ? trimmed.slice(0, MAX_PROMPT_CHARS).trim()
      : trimmed;

  // Create or reuse a project
  if (!_projectId) {
    const project = await stitch.createProject("AI Canva");
    _projectId = project.id;
  }

  const project = stitch.project(_projectId);
  const screen = await project.generate(shortPrompt, "AGNOSTIC", STITCH_MODEL);

  // Get the HTML download URL and fetch the actual HTML content
  const htmlUrl = await screen.getHtml();
  const imageUrl = await screen.getImage();

  // Fetch the HTML content from the download URL
  const htmlResponse = await fetch(htmlUrl);
  if (!htmlResponse.ok) {
    throw new Error("Failed to fetch Stitch HTML: " + htmlResponse.status);
  }
  const html = await htmlResponse.text();

  return { html, imageUrl };
}
