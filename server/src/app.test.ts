import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

/**
 * The local server delegates AI generation to ./ollama, ./fal and ./stitch.
 * We mock those so API tests assert routing/validation/response shaping
 * without making real network calls.
 */
vi.mock("./ollama.js", () => ({
  generateContent: vi.fn(async (systemPrompt: string, userPrompt: string) => ({
    content: `response for: ${userPrompt}`,
    model: "mock-model",
    promptTokens: 10,
    completionTokens: 5,
    totalTokens: 15,
  })),
}));

vi.mock("./fal.js", () => ({
  generateCartoonImage: vi.fn(async () => "https://img.example/avatar.png"),
}));

vi.mock("./stitch.js", () => ({
  generateStitchUI: vi.fn(async () => ({
    html: "<div>mock ui</div>",
    imageUrl: "https://img.example/ui.png",
  })),
}));

// Silence expected console noise (error paths intentionally log).
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/health", () => {
  it("reports ok with missing keys by default", async () => {
    delete process.env.OLLAMA_API_KEY;
    delete process.env.FAL_KEY;
    delete process.env.STITCH_API_KEY;

    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      ollamaKey: "missing",
      falKey: "missing",
      stitchKey: "missing",
    });
  });
});

describe("POST /api/generate", () => {
  it("returns 400 when userPrompt is missing", async () => {
    const res = await request(createApp())
      .post("/api/generate")
      .send({ systemPrompt: "sys" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("userPrompt");
  });

  it("returns content + token usage, defaulting the system prompt", async () => {
    const res = await request(createApp())
      .post("/api/generate")
      .send({ userPrompt: "hello" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      content: "response for: hello",
      model: "mock-model",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });
  });
});

describe("POST /api/generate-image", () => {
  it("returns 400 when neither prompt nor imageUrl is provided", async () => {
    const res = await request(createApp()).post("/api/generate-image").send({});
    expect(res.status).toBe(400);
  });

  it("returns an imageUrl on success", async () => {
    const res = await request(createApp())
      .post("/api/generate-image")
      .send({ prompt: "a cartoon" });
    expect(res.status).toBe(200);
    expect(res.body.imageUrl).toBe("https://img.example/avatar.png");
  });
});

describe("POST /api/stitch-generate + GET /api/stitch-status/:jobId", () => {
  it("returns 400 when prompt is missing", async () => {
    const res = await request(createApp()).post("/api/stitch-generate").send({});
    expect(res.status).toBe(400);
  });

  it("returns a jobId immediately and the job reaches done", async () => {
    const app = createApp();
    const created = await request(app)
      .post("/api/stitch-generate")
      .send({ prompt: "build a screen" });
    expect(created.status).toBe(200);
    expect(created.body.jobId).toBeTruthy();
    expect(created.body.status).toBe("queued");
    const jobId = created.body.jobId as string;

    const { generateStitchUI } = await import("./stitch.js");
    const stitchMock = generateStitchUI as ReturnType<typeof vi.fn>;
    expect(stitchMock).toHaveBeenCalledWith("build a screen");

    // Poll until the background job reports done.
    await vi.waitFor(async () => {
      const res = await request(app).get(`/api/stitch-status/${jobId}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("done");
      expect(res.body.html).toBeDefined();
    });
  });

  it("returns 404 for an unknown job id", async () => {
    const res = await request(createApp()).get("/api/stitch-status/nope");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/admin/stats", () => {
  it("returns 501 locally (production-only feature)", async () => {
    const res = await request(createApp()).get("/api/admin/stats");
    expect(res.status).toBe(501);
  });
});
