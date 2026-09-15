import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIProviderError } from "./ai.js";
import { generateValContent } from "./val.js";

describe("generateValContent", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.VAL_API_KEY = "test-val-key";
    delete process.env.VAL_MODEL;
    delete process.env.VAL_TIMEOUT_MS;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.VAL_API_KEY;
    delete process.env.VAL_MODEL;
    delete process.env.VAL_TIMEOUT_MS;
  });

  it("calls VAL Chat Completions and normalizes the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "openai-gpt-4.1",
        choices: [{ message: { content: "pong" } }],
        usage: { prompt_tokens: 4, completion_tokens: 1, total_tokens: 5 },
      }),
    });
    globalThis.fetch = fetchMock;

    await expect(generateValContent("Say only pong.", "Say pong.")).resolves.toEqual({
      content: "pong",
      model: "openai-gpt-4.1",
      promptTokens: 4,
      completionTokens: 1,
      totalTokens: 5,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://val.rmit.edu.au/api/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-val-key" }),
        body: JSON.stringify({
          model: "openai-gpt-4.1",
          messages: [
            { role: "system", content: "Say only pong." },
            { role: "user", content: "Say pong." },
          ],
        }),
      }),
    );
  });

  it("fails clearly when VAL_API_KEY is missing", async () => {
    delete process.env.VAL_API_KEY;
    await expect(generateValContent("sys", "hello")).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining("VAL_API_KEY"),
    } satisfies Partial<AIProviderError>);
  });

  it.each([
    [401, 401, "rejected VAL_API_KEY"],
    [400, 400, "rejected the request or model"],
    [405, 405, "Use POST https://val.rmit.edu.au/api/chat/completions"],
  ])("maps VAL HTTP %i to a useful %i error", async (upstreamStatus, status, message) => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: upstreamStatus,
      json: async () => ({ error: { message: "provider detail" } }),
    });

    await expect(generateValContent("sys", "hello")).rejects.toMatchObject({
      status,
      message: expect.stringContaining(message),
    } satisfies Partial<AIProviderError>);
  });

  it("maps timeouts and network failures without leaking the API key", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(
      Object.assign(new Error("timed out"), { name: "TimeoutError" }),
    );
    await expect(generateValContent("sys", "hello")).rejects.toMatchObject({
      status: 504,
      message: expect.stringContaining("timed out"),
    } satisfies Partial<AIProviderError>);

    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("network down"));
    await expect(generateValContent("sys", "hello")).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining("could not be reached"),
    } satisfies Partial<AIProviderError>);
  });
});
