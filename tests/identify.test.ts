import { afterEach, describe, expect, it } from "vitest";
import { identificationSchema, identifyCard, identifyMode, IdentifyError } from "@/lib/identify";

const img = { mime: "image/jpeg" as const, bytes: Buffer.from([0xff, 0xd8, 0xff]) };

afterEach(() => {
  delete process.env.IDENTIFY_MODE;
  delete process.env.ANTHROPIC_API_KEY;
});

describe("identify", () => {
  it("is unavailable without credentials and says so", async () => {
    expect(identifyMode()).toBe("unavailable");
    await expect(identifyCard(img, null)).rejects.toBeInstanceOf(IdentifyError);
  });
  it("uses claude mode when a key is configured", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    expect(identifyMode()).toBe("claude");
  });
  it("returns a schema-valid sample in mock mode", async () => {
    process.env.IDENTIFY_MODE = "mock";
    const result = await identifyCard(img, img);
    expect(identificationSchema.safeParse(result).success).toBe(true);
    expect(result.confidence).toBe("low");
  });
});
