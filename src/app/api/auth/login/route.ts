import { NextResponse } from "next/server";
import { startSession, verifyPassword } from "@/lib/auth";
import { getUserWithHashByEmail } from "@/lib/repo";
import { clientKey, jsonError, rateLimit, readJson, sameOriginError } from "@/lib/security";
import { loginSchema } from "@/lib/validation";

// Verified against this when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

export async function POST(request: Request) {
  const blocked = sameOriginError(request);
  if (blocked) return blocked;
  if (!rateLimit(`login:${clientKey(request)}`, 10, 15 * 60_000)) {
    return jsonError("Too many attempts. Try again later.", 429);
  }
  const parsed = await readJson(request, loginSchema);
  if (parsed.response) return parsed.response;
  const { email, password } = parsed.data;
  const user = getUserWithHashByEmail(email);
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return jsonError("Incorrect email or password", 401);
  await startSession(user.id);
  return NextResponse.json({ ok: true, username: user.username });
}
