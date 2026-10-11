import { z } from "zod";

export const SPORTS = ["baseball", "basketball", "football", "hockey", "soccer", "other"] as const;
export type Sport = (typeof SPORTS)[number];

const text = (max: number) => z.string().trim().max(max);

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_]{3,20}$/, "Username must be 3-20 letters, numbers or underscores"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export const collectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  description: text(300).default(""),
  isPublic: z.boolean().default(true),
});

const cardShape = {
  player: text(100),
  year: text(20),
  brand: text(60),
  setName: text(100),
  cardNumber: text(30),
  team: text(60),
  sport: z.enum(SPORTS),
  parallel: text(80),
  grade: text(40),
  rookie: z.boolean(),
  notes: text(500),
  forSale: z.boolean(),
  forTrade: z.boolean(),
  listingNote: text(200),
};

export const createCardSchema = z.object({
  ...cardShape,
  collectionId: z.number().int().positive(),
  frontImageId: z.string().uuid(),
  backImageId: z.string().uuid().nullable().default(null),
});

// Plain .partial() on a schema without defaults: omitted fields stay omitted instead of resetting.
export const updateCardSchema = z.object(cardShape).partial().extend({
  collectionId: z.number().int().positive().optional(),
});

export const profileSchema = z.object({
  bio: text(300).default(""),
  contactLink: z.string().trim().max(200).default(""),
});

/**
 * Contact links are shown to other users, so only allow plain email addresses
 * (turned into mailto:) and http(s)/mailto URLs. Returns null when invalid.
 */
export function normalizeContactLink(input: string): string | null {
  const value = input.trim();
  if (value === "") return "";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  try {
    const url = new URL(value);
    if (!["https:", "http:", "mailto:"].includes(url.protocol)) return null;
    if (url.protocol !== "mailto:" && !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}
