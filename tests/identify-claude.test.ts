import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { identifyCard, IdentifyError } from "@/lib/identify";

const img = { mime: "image/jpeg" as const, bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]) };

const sample = {
  player: "Mike Trout", year: "2011", brand: "Topps", set_name: "Update", card_number: "US175", team: "Angels",
  sport: "baseball", parallel: "", rookie: true, grade: "", confidence: "high", notes: "Clear photo.",
};

let server: http.Server;
let requests: { path: string; body: any }[] = [];
let reply: { status: number; body: unknown } = { status: 200, body: {} };

function message(text: string, stop_reason = "end_turn") {
  return {
    id: "msg_test", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason, stop_sequence: null,
    content: [{ type: "text", text }], usage: { input_tokens: 10, output_tokens: 10 },
  };
}

beforeEach(async () => {
  requests = [];
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      requests.push({ path: req.url ?? "", body: JSON.parse(raw || "{}") });
      res.writeHead(reply.status, { "content-type": "application/json" });
      res.end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.ANTHROPIC_API_KEY = "sk-test";
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  delete process.env.ANTHROPIC_BASE_URL;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_MODEL;
});

describe("identifyCard with the Claude API", () => {
  it("sends both photos with a JSON schema and parses the structured result", async () => {
    reply = { status: 200, body: message(JSON.stringify(sample)) };
    const result = await identifyCard(img, img);
    expect(result.player).toBe("Mike Trout");
    expect(result.rookie).toBe(true);

    const body = requests[0].body;
    expect(requests[0].path).toContain("/v1/messages");
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.output_config.format.type).toBe("json_schema");
    const content = body.messages[0].content;
    expect(content.filter((b: any) => b.type === "image")).toHaveLength(2);
    expect(content[1].source.media_type).toBe("image/jpeg");
  });

  it("sends only the front image when there is no back photo, and honors ANTHROPIC_MODEL", async () => {
    process.env.ANTHROPIC_MODEL = "claude-sonnet-5-5";
    reply = { status: 200, body: message(JSON.stringify(sample)) };
    await identifyCard(img, null);
    expect(requests[0].body.model).toBe("claude-sonnet-5-5");
    expect(requests[0].body.messages[0].content.filter((b: any) => b.type === "image")).toHaveLength(1);
  });

  it("turns refusals and unparseable output into friendly errors", async () => {
    reply = { status: 200, body: message("", "refusal") };
    await expect(identifyCard(img, null)).rejects.toBeInstanceOf(IdentifyError);
    reply = { status: 200, body: message("not json at all") };
    await expect(identifyCard(img, null)).rejects.toBeInstanceOf(IdentifyError);
  });

  it("maps API failures to user-facing errors", async () => {
    reply = { status: 401, body: { type: "error", error: { type: "authentication_error", message: "bad key" } } };
    await expect(identifyCard(img, null)).rejects.toThrow(/misconfigured/);
    reply = { status: 400, body: { type: "error", error: { type: "invalid_request_error", message: "nope" } } };
    await expect(identifyCard(img, null)).rejects.toThrow(/Identification failed/);
  });
});
