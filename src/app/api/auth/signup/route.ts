import { NextResponse } from "next/server";
import { hashPassword, startSession } from "@/lib/auth";
import { createUser, DuplicateError } from "@/lib/repo";
import { clientKey, jsonError, rateLimit, readJson, sameOriginError } from "@/lib/security";
import { signupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const blocked = sameOriginError(request);
  if (blocked) return blocked;
  if (!rateLimit(`signup:${clientKey(request)}`, 10, 15 * 60_000)) {
    return jsonError("Too many attempts. Try again later.", 429);
  }
  const parsed = await readJson(request, signupSchema);
  if (parsed.response) return parsed.response;
  const { email, username, password } = parsed.data;
  try {
    const user = createUser(email, username, await hashPassword(password));
    await startSession(user.id);
    return NextResponse.json({ ok: true, username: user.username });
  } catch (error) {
    if (error instanceof DuplicateError) {
      return jsonError(error.field === "email" ? "That email is already registered" : "That username is taken", 409);
    }
    throw error;
  }
}
