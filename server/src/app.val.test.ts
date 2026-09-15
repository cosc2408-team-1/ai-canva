import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

describe("POST /api/generate with RMIT VAL", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.AI_PROVIDER = "val";
    process.env.VAL_API_KEY = "test-val-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.AI_PROVIDER;
    delete process.env.VAL_API_KEY;
  });

  it("returns the established generate response contract from a mocked VAL call", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "VAL response" } }],
        usage: { prompt_tokens: 8, completion_tokens: 3, total_tokens: 11 },
      }),
    });

    const res = await request(createApp())
      .post("/api/generate")
      .send({ systemPrompt: "sys", userPrompt: "hello" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      content: "VAL response",
      model: "openai-gpt-4.1",
      usage: { promptTokens: 8, completionTokens: 3, totalTokens: 11 },
    });
  });

  it("passes an upstream VAL authentication failure through the route", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "invalid key" } }),
    });

    const res = await request(createApp()).post("/api/generate").send({ userPrompt: "hello" });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("VAL_API_KEY");
  });
});
