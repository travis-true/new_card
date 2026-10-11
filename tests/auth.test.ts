import { describe, expect, it } from "vitest";
import { createSessionToken, hashPassword, readSessionToken, verifyPassword } from "@/lib/auth";

describe("passwords", () => {
  it("verifies the right password only", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
  });
  it("salts each hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });
  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("session tokens", () => {
  it("round-trips the user id", () => {
    expect(readSessionToken(createSessionToken(42))).toBe(42);
  });
  it("rejects tampering", () => {
    const token = createSessionToken(42);
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: 1, exp: Date.now() + 1e9 })).toString("base64url");
    expect(readSessionToken(`${forged}.${sig}`)).toBeNull();
    expect(readSessionToken(`${payload}.AAAA`)).toBeNull();
    expect(readSessionToken("nonsense")).toBeNull();
  });
  it("rejects expired tokens", () => {
    const token = createSessionToken(7, Date.now() - 31 * 86_400_000);
    expect(readSessionToken(token)).toBeNull();
  });
});
