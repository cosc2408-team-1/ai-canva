import { describe, expect, it } from "vitest";
import type { BoxData } from "../types.js";
import { cleanBoxDataForFirestore } from "./serialization.js";

describe("cleanBoxDataForFirestore", () => {
  it("drops undefined values entirely", () => {
    const data: Record<string, BoxData> = {
      box1: {
        content: "hi",
        status: "done",
        error: undefined,
        output: "out",
      } as unknown as BoxData,
    };
    const cleaned = cleanBoxDataForFirestore(data);
    expect("error" in cleaned.box1).toBe(false);
    expect(cleaned.box1.content).toBe("hi");
  });

  it("strips base64 imageData but keeps http(s) image URLs", () => {
    const data: Record<string, BoxData> = {
      a: { imageData: "data:image/png;base64,AAAA", content: "x" } as unknown as BoxData,
      b: { imageData: "https://storage.example/a.png", content: "y" } as unknown as BoxData,
    };
    const cleaned = cleanBoxDataForFirestore(data);
    expect("imageData" in cleaned.a).toBe(false);
    expect(cleaned.b.imageData).toBe("https://storage.example/a.png");
  });

  it("preserves other fields unchanged", () => {
    const data: Record<string, BoxData> = {
      b: { content: "c", output: "o", status: "running", tokens: { promptTokens: 1, completionTokens: 2, totalTokens: 3 } } as unknown as BoxData,
    };
    const cleaned = cleanBoxDataForFirestore(data);
    expect(cleaned.b).toEqual(data.b);
  });
});
