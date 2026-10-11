import { describe, expect, it } from "vitest";
import { sniffImageMime } from "@/lib/images";

describe("sniffImageMime", () => {
  it("detects common formats by magic bytes", () => {
    expect(sniffImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffImageMime(Buffer.from("RIFF\0\0\0\0WEBP"))).toBe("image/webp");
    expect(sniffImageMime(Buffer.from("GIF89a"))).toBe("image/gif");
  });
  it("rejects everything else", () => {
    expect(sniffImageMime(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(sniffImageMime(Buffer.from("%PDF-1.4"))).toBeNull();
    expect(sniffImageMime(new Uint8Array())).toBeNull();
  });
});
