import { NextResponse } from "next/server";
import { deleteCollection, getCollection, listCollections, updateCollection } from "@/lib/repo";
import { authedMutation, jsonError, readJson } from "@/lib/security";
import { collectionSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const gate = await authedMutation(request);
  if (gate.response) return gate.response;
  const collection = getCollection(Number((await params).id));
  if (!collection || collection.userId !== gate.user.id) return jsonError("Not found", 404);
  const parsed = await readJson(request, collectionSchema);
  if (parsed.response) return parsed.response;
  updateCollection(collection.id, parsed.data.name, parsed.data.description, parsed.data.isPublic);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const gate = await authedMutation(request);
  if (gate.response) return gate.response;
  const collection = getCollection(Number((await params).id));
  if (!collection || collection.userId !== gate.user.id) return jsonError("Not found", 404);
  if (listCollections(gate.user.id).length <= 1) {
    return jsonError("You need at least one collection", 400);
  }
  deleteCollection(collection.id);
  return NextResponse.json({ ok: true });
}
