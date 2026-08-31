import { describe, expect, it } from "vitest";
import { extractCode, wrapCodeInHtml, wrapUIInHtml } from "./code.js";

describe("extractCode", () => {
  it("returns trimmed code with no markdown fence", () => {
    expect(extractCode("  const x = 1;  ")).toBe("const x = 1;");
  });

  it("strips a ```jsx ... ``` block", () => {
    const raw = "```jsx\nfunction App(){return null;}\n```";
    expect(extractCode(raw)).toBe("function App(){return null;}");
  });

  it("strips a plain ``` ... ``` block", () => {
    const raw = "```\nfunction App(){}\n```";
    expect(extractCode(raw)).toBe("function App(){}");
  });

  it("keeps surrounding prose that is not fenced", () => {
    const raw = "Here is the code:\nfunction App(){}";
    expect(extractCode(raw)).toBe(raw.trim());
  });
});

describe("wrapCodeInHtml", () => {
  it("produces an HTML document containing the code", () => {
    const html = wrapCodeInHtml("function App(){}");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('type="text/babel"');
    expect(html).toContain("function App(){}");
  });
});

describe("wrapUIInHtml", () => {
  it("includes Tailwind CDN and Inter font for UI previews", () => {
    const html = wrapUIInHtml("const x = 1;");
    expect(html).toContain("https://cdn.tailwindcss.com");
    expect(html).toContain("fonts.googleapis.com");
    expect(html).toContain("const x = 1;");
  });
});
