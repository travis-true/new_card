import { describe, expect, it } from "vitest";
import {
  createCardSchema,
  loginSchema,
  normalizeContactLink,
  signupSchema,
  updateCardSchema,
} from "@/lib/validation";

describe("normalizeContactLink", () => {
  it("allows empty", () => expect(normalizeContactLink("  ")).toBe(""));
  it("turns an email into mailto", () => expect(normalizeContactLink("a@b.co")).toBe("mailto:a@b.co"));
  it("accepts https links", () => expect(normalizeContactLink("https://instagram.com/me")).toBe("https://instagram.com/me"));
  it.each(["javascript:alert(1)", "data:text/html,hi", "ftp://x.com/a", "not a url", "https://localhost"])(
    "rejects %s",
    (value) => expect(normalizeContactLink(value)).toBeNull(),
  );
});

describe("schemas", () => {
  it("normalizes email on signup", () => {
    const parsed = signupSchema.parse({ email: " Me@Example.COM ", username: "card_fan", password: "longenough" });
    expect(parsed.email).toBe("me@example.com");
  });
  it("rejects bad usernames and short passwords", () => {
    expect(signupSchema.safeParse({ email: "a@b.co", username: "a b", password: "longenough" }).success).toBe(false);
    expect(signupSchema.safeParse({ email: "a@b.co", username: "okname", password: "short" }).success).toBe(false);
  });
  it("login needs a password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
  it("partial card updates do not reset omitted fields", () => {
    expect(updateCardSchema.parse({ player: "X" })).toEqual({ player: "X" });
  });
  it("create card requires image ids", () => {
    const base = {
      player: "", year: "", brand: "", setName: "", cardNumber: "", team: "", sport: "other", parallel: "", grade: "",
      rookie: false, notes: "", forSale: false, forTrade: false, listingNote: "", collectionId: 1,
    };
    expect(createCardSchema.safeParse(base).success).toBe(false);
    expect(
      createCardSchema.safeParse({ ...base, frontImageId: "11111111-1111-4111-8111-111111111111" }).success,
    ).toBe(true);
  });
});
