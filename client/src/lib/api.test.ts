import { afterEach, describe, expect, it, vi } from "vitest";
import { generate, GENERATION_TIMEOUT_MS } from "./api.js";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("text generation deadline", () => {
  it("aborts a hung request without retrying", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetch);
    const result = generate({ systemPrompt: "Test", userPrompt: "Synthetic test" });
    const rejected = expect(result).rejects.toThrow("timed out or was interrupted");
    await vi.advanceTimersByTimeAsync(GENERATION_TIMEOUT_MS);
    await rejected;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].signal?.aborted).toBe(true);
  });

  it("also bounds a response body that never finishes", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => new Promise(() => {}) }));
    const result = generate({ systemPrompt: "Test", userPrompt: "Synthetic test" });
    const rejected = expect(result).rejects.toThrow("timed out or was interrupted");
    await vi.advanceTimersByTimeAsync(GENERATION_TIMEOUT_MS);
    await rejected;
  });

  it("returns successful output unchanged and clears its timer", async () => {
    vi.useFakeTimers();
    const output = { content: "Original output", model: "test" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => output }));
    expect(await generate({ systemPrompt: "Test", userPrompt: "Synthetic test" })).toEqual(output);
    expect(vi.getTimerCount()).toBe(0);
  });
});
