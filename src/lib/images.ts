import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db, uploadsDir } from "./db";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

const EXT: Record<ImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Detect the real image type from magic bytes; never trust the client's content type. */
export function sniffImageMime(bytes: Uint8Array): ImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  return null;
}

export type StoredImage = { id: string; mime: ImageMime; bytes: Buffer };

export class ImageError extends Error {}

/** Validate an uploaded file and write it to disk. Throws ImageError with a user-facing message. */
export async function saveUpload(userId: number, file: File, label: string): Promise<StoredImage> {
  if (file.size === 0) throw new ImageError(`The ${label} image is empty`);
  if (file.size > MAX_IMAGE_BYTES) throw new ImageError(`The ${label} image is larger than 8 MB`);
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = sniffImageMime(bytes);
  if (!mime) throw new ImageError(`The ${label} image must be a JPEG, PNG, WebP or GIF`);
  const id = crypto.randomUUID();
  const filename = `${id}.${EXT[mime]}`;
  fs.mkdirSync(uploadsDir(), { recursive: true });
  fs.writeFileSync(path.join(/*turbopackIgnore: true*/ uploadsDir(), filename), bytes);
  db().prepare("INSERT INTO images (id, user_id, mime, filename) VALUES (?, ?, ?, ?)").run(id, userId, mime, filename);
  return { id, mime, bytes };
}

export function readImageFile(filename: string): Buffer | null {
  // filenames are generated server-side (uuid.ext); reject anything else defensively
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(filename)) return null;
  try {
    return fs.readFileSync(path.join(/*turbopackIgnore: true*/ uploadsDir(), filename));
  } catch {
    return null;
  }
}

export function deleteImageFiles(filenames: string[]): void {
  for (const name of filenames) {
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(name)) continue;
    try {
      fs.unlinkSync(path.join(/*turbopackIgnore: true*/ uploadsDir(), name));
    } catch {
      /* already gone */
    }
  }
}
