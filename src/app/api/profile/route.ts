import { NextResponse } from "next/server";
import { updateProfile } from "@/lib/repo";
import { authedMutation, jsonError, readJson } from "@/lib/security";
import { normalizeContactLink, profileSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  const gate = await authedMutation(request);
  if (gate.response) return gate.response;
  const parsed = await readJson(request, profileSchema);
  if (parsed.response) return parsed.response;
  const link = normalizeContactLink(parsed.data.contactLink);
  if (link === null) {
    return jsonError("Contact link must be an email address or an http(s) link", 400);
  }
  updateProfile(gate.user.id, parsed.data.bio, link);
  return NextResponse.json({ ok: true, contactLink: link });
}
