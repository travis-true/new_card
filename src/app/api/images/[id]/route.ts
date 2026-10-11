import { getCurrentUser } from "@/lib/auth";
import { readImageFile } from "@/lib/images";
import { getImage, imageIsPublic } from "@/lib/repo";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const image = getImage(id);
  if (!image) return new Response("Not found", { status: 404 });

  const user = await getCurrentUser();
  const isOwner = user?.id === image.userId;
  if (!isOwner && !imageIsPublic(image.id)) return new Response("Not found", { status: 404 });

  const bytes = readImageFile(image.filename);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": image.mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": isOwner ? "private, max-age=3600" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
