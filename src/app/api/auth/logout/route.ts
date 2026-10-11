import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth";
import { sameOriginError } from "@/lib/security";

export async function POST(request: Request) {
  const blocked = sameOriginError(request);
  if (blocked) return blocked;
  await endSession();
  return NextResponse.json({ ok: true });
}
