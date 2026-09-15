import { AIProviderError, type GenerateResult } from "./ai.js";

const VAL_BASE_URL = "https://val.rmit.edu.au/api";
const DEFAULT_MODEL = "openai-gpt-4.1";
const DEFAULT_TIMEOUT_MS = 30_000;

interface ValResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string } | string;
}

function errorDetail(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const error = (body as ValResponse).error;
  if (typeof error === "string") return error;
  return error?.message || "";
}

function configuredTimeout(): number {
  const value = Number(process.env.VAL_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

/**
 * Calls RMIT VAL's OpenAI-compatible Chat Completions API and converts its
 * response into the existing AI Canva text-generation result shape.
 */
export async function generateValContent(
  systemPrompt: string,
  userPrompt: string,
): Promise<GenerateResult> {
  const apiKey = process.env.VAL_API_KEY;
  if (!apiKey) {
    throw new AIProviderError(
      503,
      "RMIT VAL is not configured. Set VAL_API_KEY and AI_PROVIDER=val in server/.env.",
    );
  }

  const model = process.env.VAL_MODEL || DEFAULT_MODEL;
  let response: Response;
  try {
    response = await fetch(`${VAL_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(configuredTimeout()),
    });
  } catch (error: any) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new AIProviderError(504, "RMIT VAL request timed out. Try again or increase VAL_TIMEOUT_MS.");
    }
    throw new AIProviderError(502, "RMIT VAL could not be reached. Check your network connection and try again.");
  }

  const body = await response.json().catch(() => ({})) as ValResponse;
  if (!response.ok) {
    const detail = errorDetail(body);
    if (response.status === 401) {
      throw new AIProviderError(401, "RMIT VAL rejected VAL_API_KEY. Check the key and try again.");
    }
    if (response.status === 400) {
      throw new AIProviderError(400, `RMIT VAL rejected the request or model \"${model}\".${detail ? ` ${detail}` : ""}`);
    }
    if (response.status === 405) {
      throw new AIProviderError(405, "RMIT VAL rejected the endpoint or HTTP method. Use POST https://val.rmit.edu.au/api/chat/completions.");
    }
    throw new AIProviderError(502, `RMIT VAL request failed (${response.status}).${detail ? ` ${detail}` : ""}`);
  }

  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new AIProviderError(502, "RMIT VAL returned no choices[0].message.content.");
  }

  const promptTokens = body.usage?.prompt_tokens ?? 0;
  const completionTokens = body.usage?.completion_tokens ?? 0;
  return {
    content,
    model: body.model || model,
    promptTokens,
    completionTokens,
    totalTokens: body.usage?.total_tokens ?? promptTokens + completionTokens,
  };
}
