import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGenerateUrl,
  DEMO_AI_API_BASE_STORAGE_KEY,
  normalizeExternalApiBase,
  resolveGenerateUrl,
} from "./apiTarget";

function stubLocalStorage(initialValue: string | null = null) {
  const values = new Map<string, string>();
  if (initialValue) values.set(DEMO_AI_API_BASE_STORAGE_KEY, initialValue);

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });

  return values;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("demo AI API target", () => {
  it("uses Firebase /api by default", () => {
    expect(buildGenerateUrl()).toBe("/api/generate");
    expect(buildGenerateUrl("")).toBe("/api/generate");

    vi.stubEnv("VITE_AI_API_BASE_URL", "");
    expect(resolveGenerateUrl()).toBe("/api/generate");
  });

  it("uses the build-time VITE_AI_API_BASE_URL when no runtime override exists", () => {
    vi.stubEnv("VITE_AI_API_BASE_URL", "https://build-demo.trycloudflare.com");
    expect(resolveGenerateUrl()).toBe(
      "https://build-demo.trycloudflare.com/api/generate",
    );
  });

  it("gives the runtime localStorage override precedence over VITE_AI_API_BASE_URL", () => {
    vi.stubEnv("VITE_AI_API_BASE_URL", "https://build-demo.trycloudflare.com");
    stubLocalStorage("https://runtime-demo.trycloudflare.com");

    expect(resolveGenerateUrl()).toBe(
      "https://runtime-demo.trycloudflare.com/api/generate",
    );
  });

  it("falls back to VITE_AI_API_BASE_URL after a runtime override is removed", () => {
    vi.stubEnv("VITE_AI_API_BASE_URL", "https://build-demo.trycloudflare.com");
    const values = stubLocalStorage("https://runtime-demo.trycloudflare.com");

    expect(resolveGenerateUrl()).toBe(
      "https://runtime-demo.trycloudflare.com/api/generate",
    );

    values.delete(DEMO_AI_API_BASE_STORAGE_KEY);
    expect(resolveGenerateUrl()).toBe(
      "https://build-demo.trycloudflare.com/api/generate",
    );
  });

  it("uses the safe fallback when a runtime or build-time override is invalid", () => {
    vi.stubEnv("VITE_AI_API_BASE_URL", "");
    stubLocalStorage("javascript:alert(1)");
    expect(resolveGenerateUrl()).toBe("/api/generate");

    vi.stubEnv("VITE_AI_API_BASE_URL", "javascript:alert(1)");
    stubLocalStorage();
    expect(resolveGenerateUrl()).toBe("/api/generate");
  });

  it("routes generation through an external HTTPS origin", () => {
    expect(
      buildGenerateUrl(
        "https://example-demo.trycloudflare.com/"
      )
    ).toBe(
      "https://example-demo.trycloudflare.com/api/generate"
    );
  });

  it("does not duplicate /api", () => {
    expect(
      buildGenerateUrl(
        "https://example-demo.trycloudflare.com/api"
      )
    ).toBe(
      "https://example-demo.trycloudflare.com/api/generate"
    );
  });

  it("removes query strings and fragments", () => {
    expect(
      normalizeExternalApiBase(
        "https://example-demo.trycloudflare.com/?demo=1#test"
      )
    ).toBe(
      "https://example-demo.trycloudflare.com"
    );
  });

  it("rejects unsafe schemes and credential URLs", () => {
    expect(
      buildGenerateUrl("javascript:alert(1)")
    ).toBe("/api/generate");

    expect(
      buildGenerateUrl(
        "https://user:pass@example.com"
      )
    ).toBe("/api/generate");
  });
});
