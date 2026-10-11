import { NextResponse } from "next/server";
import { identifyCard, identifyMode, IdentifyError } from "@/lib/identify";
import { ImageError, saveUpload } from "@/lib/images";
import { purgeOrphanImages } from "@/lib/repo";
import { authedMutation, jsonError, rateLimit } from "@/lib/security";

export const maxDuration = 120;

export async function POST(request: Request) {
  const gate = await authedMutation(request);
  if (gate.response) return gate.response;
  const user = gate.user;

  if (!rateLimit(`scan:${user.id}`, 30, 60 * 60_000)) {
    return jsonError("Scan limit reached. Try again in a while.", 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Invalid upload", 400);
  }
  const front = form.get("front");
  const back = form.get("back");
  if (!(front instanceof File)) return jsonError("A photo of the card front is required", 400);

  purgeOrphanImages();

  try {
    const frontImage = await saveUpload(user.id, front, "front");
    const backImage = back instanceof File && back.size > 0 ? await saveUpload(user.id, back, "back") : null;

    let identification = null;
    let identifyError: string | null = null;
    try {
      identification = await identifyCard(frontImage, backImage);
    } catch (error) {
      if (error instanceof IdentifyError) identifyError = error.message;
      else throw error;
    }

    return NextResponse.json({
      frontImageId: frontImage.id,
      backImageId: backImage?.id ?? null,
      mode: identifyMode(),
      identification,
      identifyError,
    });
  } catch (error) {
    if (error instanceof ImageError) return jsonError(error.message, 400);
    throw error;
  }
}
