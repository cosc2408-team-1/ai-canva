/** Normalized text-generation result used by every supported provider. */
export interface GenerateResult {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** An expected upstream-provider failure that the generate route can expose safely. */
export class AIProviderError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
