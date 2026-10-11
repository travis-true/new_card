import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import type { User } from "./repo";

/** Reject cross-site state-changing requests (cookies are SameSite=Lax; this is defense in depth). */
export function sameOriginError(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    if (originHost !== host) return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
    return null;
  }
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }
  return null;
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

type Gate = { user: User; response?: undefined } | { user?: undefined; response: NextResponse };

/** Origin check + login check for mutating API routes. */
export async function authedMutation(request: Request): Promise<Gate> {
  const blocked = sameOriginError(request);
  if (blocked) return { response: blocked };
  const user = await getCurrentUser();
  if (!user) return { response: jsonError("Please log in", 401) };
  return { user };
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Tiny in-memory fixed-window limiter. Returns true when the call is allowed. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function resetRateLimits(): void {
  buckets.clear();
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

/** Parse and validate a JSON request body. */
export async function readJson<T>(
  request: Request,
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } },
): Promise<{ data: T; response?: undefined } | { data?: undefined; response: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: jsonError("Invalid request body", 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { response: jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400) };
  }
  return { data: parsed.data };
}
