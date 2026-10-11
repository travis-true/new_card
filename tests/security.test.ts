import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits, sameOriginError } from "@/lib/security";

const req = (headers: Record<string, string>) => new Request("http://localhost/api/x", { method: "POST", headers });

describe("rateLimit", () => {
  beforeEach(resetRateLimits);
  it("blocks after the limit and recovers after the window", () => {
    expect(rateLimit("k", 2, 1000, 0)).toBe(true);
    expect(rateLimit("k", 2, 1000, 1)).toBe(true);
    expect(rateLimit("k", 2, 1000, 2)).toBe(false);
    expect(rateLimit("k", 2, 1000, 1001)).toBe(true);
  });
  it("keeps keys separate", () => {
    expect(rateLimit("a", 1, 1000, 0)).toBe(true);
    expect(rateLimit("b", 1, 1000, 0)).toBe(true);
  });
});

describe("sameOriginError", () => {
  it("allows matching origin", () => {
    expect(sameOriginError(req({ origin: "https://app.test", host: "app.test" }))).toBeNull();
  });
  it("blocks a different origin", () => {
    expect(sameOriginError(req({ origin: "https://evil.test", host: "app.test" }))?.status).toBe(403);
  });
  it("blocks cross-site fetch metadata without an origin", () => {
    expect(sameOriginError(req({ "sec-fetch-site": "cross-site", host: "app.test" }))?.status).toBe(403);
  });
  it("allows non-browser clients with no origin headers", () => {
    expect(sameOriginError(req({ host: "app.test" }))).toBeNull();
  });
});
