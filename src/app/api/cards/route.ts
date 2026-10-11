import { NextResponse } from "next/server";
import { createCard, getCollection, imageOwnedBy } from "@/lib/repo";
import { authedMutation, jsonError, readJson } from "@/lib/security";
import { createCardSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const gate = await authedMutation(request);
  if (gate.response) return gate.response;
  const parsed = await readJson(request, createCardSchema);
  if (parsed.response) return parsed.response;
  const { collectionId, frontImageId, backImageId, ...fields } = parsed.data;

  const collection = getCollection(collectionId);
  if (!collection || collection.userId !== gate.user.id) return jsonError("Collection not found", 404);
  if (!imageOwnedBy(frontImageId, gate.user.id) || (backImageId && !imageOwnedBy(backImageId, gate.user.id))) {
    return jsonError("Image not found", 400);
  }
  const card = createCard(gate.user.id, collectionId, fields, frontImageId, backImageId);
  return NextResponse.json({ id: card.id });
}
