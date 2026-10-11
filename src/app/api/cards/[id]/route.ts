import { NextResponse } from "next/server";
import { deleteCard, getCard, getCollection, updateCard } from "@/lib/repo";
import { authedMutation, jsonError, readJson } from "@/lib/security";
import { updateCardSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const gate = await authedMutation(request);
  if (gate.response) return gate.response;
  const card = getCard(Number((await params).id));
  if (!card || card.userId !== gate.user.id) return jsonError("Not found", 404);
  const parsed = await readJson(request, updateCardSchema);
  if (parsed.response) return parsed.response;
  if (parsed.data.collectionId !== undefined) {
    const target = getCollection(parsed.data.collectionId);
    if (!target || target.userId !== gate.user.id) return jsonError("Collection not found", 404);
  }
  updateCard(card.id, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const gate = await authedMutation(request);
  if (gate.response) return gate.response;
  const card = getCard(Number((await params).id));
  if (!card || card.userId !== gate.user.id) return jsonError("Not found", 404);
  deleteCard(card.id);
  return NextResponse.json({ ok: true });
}
