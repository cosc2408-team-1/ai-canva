import { AIProviderError, type GenerateResult } from "./ai.js";
import { generateContent as generateOllamaContent } from "./ollama.js";
import { generateValContent } from "./val.js";

export type AIProvider = "ollama" | "val";

export function selectedProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER || "ollama").toLowerCase();
  if (provider === "ollama" || provider === "val") return provider;
  throw new AIProviderError(400, `Unsupported AI_PROVIDER \"${provider}\". Use \"ollama\" or \"val\".`);
}

/** Routes text generation without changing the existing frontend API contract. */
export function generateContent(systemPrompt: string, userPrompt: string): Promise<GenerateResult> {
  return selectedProvider() === "val"
    ? generateValContent(systemPrompt, userPrompt)
    : generateOllamaContent(systemPrompt, userPrompt);
}
