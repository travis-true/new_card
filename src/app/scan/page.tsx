import { requireUser } from "@/lib/auth";
import { listCollections } from "@/lib/repo";
import { ScanFlow } from "@/components/ScanFlow";

export const metadata = { title: "Scan a card" };

export default async function ScanPage() {
  const user = await requireUser();
  const collections = listCollections(user.id).map((c) => ({ id: c.id, name: c.name }));
  return (
    <div>
      <h1>Scan a card</h1>
      <p className="muted">Take or upload a photo of the front and back. You can correct anything before saving.</p>
      <ScanFlow collections={collections} />
    </div>
  );
}
