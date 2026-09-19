import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "./index.js";

/**
 * Route tests for the deployed Firebase backend.
 *
 * These mirror the local Express suite in `server/src/app.val.test.ts`. The
 * provider code was copied into `functions/` when VAL was added, but nothing
 * exercised it here, so a regression in the deployed backend would not have
 * been caught before a deploy. Every VAL call is mocked — no test reaches
 * val.rmit.edu.au and no test needs a real key.
 */

const PROVIDER_ENV = ["AI_PROVIDER", "VAL_API_KEY", "VAL_MODEL"] as const;

describe("GET /api/health", () => {
  const saved = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of PROVIDER_ENV) saved.set(key, process.env[key]);
  });

  afterEach(() => {
    for (const key of PROVIDER_ENV) {
      const value = saved.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("reports the selected provider and that VAL is configured", async () => {
    process.env.AI_PROVIDER = "val";
    process.env.VAL_API_KEY = "test-val-key";

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.aiProvider).toBe("val");
    expect(res.body.valKey).toBe("configured");
  });

  it("reports a missing VAL key rather than failing the health check", async () => {
    process.env.AI_PROVIDER = "val";
    delete process.env.VAL_API_KEY;

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.aiProvider).toBe("val");
    expect(res.body.valKey).toBe("missing");
  });

  it("falls back to reporting ollama when no provider is set", async () => {
    delete process.env.AI_PROVIDER;

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.aiProvider).toBe("ollama");
  });
});

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

  it("rejects a request with no userPrompt before calling the provider", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const res = await request(app).post("/api/generate").send({ systemPrompt: "sys" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("userPrompt is required");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the established generate response contract from a mocked VAL call", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: {
        get: () => "application/json",
      },
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "VAL response" } }],
          usage: { prompt_tokens: 8, completion_tokens: 3, total_tokens: 11 },
        }),
    });

    const res = await request(app)
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
      statusText: "Unauthorized",
      headers: {
        get: () => "application/json",
      },
      text: async () =>
        JSON.stringify({
          error: { message: "invalid key" },
        }),
    });

    const res = await request(app).post("/api/generate").send({ userPrompt: "hello" });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain("VAL_API_KEY");
  });

  it("reports an unconfigured deployment as 503 rather than a generic failure", async () => {
    delete process.env.VAL_API_KEY;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const res = await request(app).post("/api/generate").send({ userPrompt: "hello" });

    expect(res.status).toBe(503);
    expect(res.body.error).toContain("VAL_API_KEY");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
