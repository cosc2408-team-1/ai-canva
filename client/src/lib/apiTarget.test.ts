import { describe, expect, it } from "vitest";
import {
  buildGenerateUrl,
  normalizeExternalApiBase,
} from "./apiTarget";

describe("demo AI API target", () => {
  it("uses Firebase /api by default", () => {
    expect(buildGenerateUrl()).toBe("/api/generate");
    expect(buildGenerateUrl("")).toBe("/api/generate");
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
