import { NextResponse } from "next/server";
import { createCollection } from "@/lib/repo";
import { authedMutation, readJson } from "@/lib/security";
import { collectionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const gate = await authedMutation(request);
  if (gate.response) return gate.response;
  const parsed = await readJson(request, collectionSchema);
  if (parsed.response) return parsed.response;
  const { name, description, isPublic } = parsed.data;
  const collection = createCollection(gate.user.id, name, description, isPublic);
  return NextResponse.json({ id: collection.id });
}
