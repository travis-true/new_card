import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { SPORTS } from "./validation";
import type { ImageMime } from "./images";

export const identificationSchema = z.object({
  player: z.string().describe("Full player name, or empty string if not visible"),
  year: z.string().describe("Four-digit season or copyright year, or empty string"),
  brand: z.string().describe("Manufacturer, e.g. Topps, Panini, Upper Deck; empty if unknown"),
  set_name: z.string().describe("Set or product line, e.g. Chrome, Prizm, Series 1; empty if unknown"),
  card_number: z.string().describe("Card number as printed, usually on the back; empty if unknown"),
  team: z.string().describe("Team name; empty if unknown"),
  sport: z.enum(SPORTS),
  parallel: z.string().describe("Parallel, insert or variant only if clearly visible (e.g. Silver Prizm); else empty"),
  rookie: z.boolean().describe("True only if a rookie card marking (RC) is visible"),
  grade: z.string().describe("Grading company and grade if the card is in a slab (e.g. PSA 10); otherwise empty"),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().describe("One short sentence on anything uncertain or worth double-checking"),
});

export type Identification = z.infer<typeof identificationSchema>;

export type IdentifyMode = "claude" | "mock" | "unavailable";

export function identifyMode(): IdentifyMode {
  if (process.env.IDENTIFY_MODE === "mock") return "mock";
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return "claude";
  return "unavailable";
}

export type ImageInput = { mime: ImageMime; bytes: Buffer };

export class IdentifyError extends Error {}

const SYSTEM_PROMPT = `You identify sports trading cards from photos of the front and (when provided) the back of a single card.

Rules:
- Report only what is visible. Leave a field as an empty string rather than guessing.
- The card back usually shows the copyright year, brand, card number and set; the front shows the player, team and any parallel finish or rookie logo.
- Set "parallel" only when a variant is clearly identifiable from the image. Do not guess color parallels from lighting.
- If the card is inside a grading slab, read the company and numeric grade from the label.
- Use "other" for the sport when it is not baseball, basketball, football, hockey or soccer.
- If the image is not a sports card, return empty fields with confidence "low" and explain in notes.
- Set confidence to "low" when key fields (player, year, set) are unreadable.`;

const MOCK_RESULT: Identification = {
  player: "Sample Player",
  year: "2023",
  brand: "Topps",
  set_name: "Chrome",
  card_number: "100",
  team: "Sample Team",
  sport: "baseball",
  parallel: "Refractor",
  rookie: true,
  grade: "",
  confidence: "low",
  notes: "Mock identification for development and tests; not read from the image.",
};

/** Validate the model's JSON output; returns null when it is missing or does not match the schema. */
export function parseIdentification(text: string): Identification | null {
  try {
    const result = identificationSchema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function identifyCard(front: ImageInput, back: ImageInput | null): Promise<Identification> {
  const mode = identifyMode();
  if (mode === "mock") return MOCK_RESULT;
  if (mode === "unavailable") {
    throw new IdentifyError("Card identification is not configured on this server. Enter the details manually.");
  }

  const client = new Anthropic();
  const image = (input: ImageInput): Anthropic.ImageBlockParam => ({
    type: "image",
    source: { type: "base64", media_type: input.mime, data: input.bytes.toString("base64") },
  });

  const content: Anthropic.ContentBlockParam[] = [
    { type: "text", text: "Front of the card:" },
    image(front),
  ];
  if (back) content.push({ type: "text", text: "Back of the card:" }, image(back));
  content.push({ type: "text", text: "Identify this card." });

  try {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(identificationSchema) },
    });
    if (response.stop_reason === "refusal") {
      throw new IdentifyError("The image could not be analyzed. Enter the details manually.");
    }
    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
    const parsed = parseIdentification(text);
    if (!parsed) {
      throw new IdentifyError("Could not read a result from the image. Try a clearer photo or enter the details manually.");
    }
    return parsed;
  } catch (error) {
    if (error instanceof IdentifyError) throw error;
    if (error instanceof Anthropic.RateLimitError) {
      throw new IdentifyError("Identification is busy right now. Try again in a moment.");
    }
    if (error instanceof Anthropic.AuthenticationError) {
      throw new IdentifyError("Card identification is misconfigured on this server. Enter the details manually.");
    }
    if (error instanceof Anthropic.APIError) {
      throw new IdentifyError("Identification failed. Try again or enter the details manually.");
    }
    throw error;
  }
}
