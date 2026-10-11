import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listCollections } from "@/lib/repo";
import { CollectionCreateForm } from "@/components/CollectionForms";

export const metadata = { title: "My collections" };

export default async function CollectionsPage() {
  const user = await requireUser();
  const collections = listCollections(user.id);
  return (
    <div>
      <h1>My collections</h1>
      <div className="tiles" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", marginBottom: 24 }}>
        {collections.map((c) => (
          <Link key={c.id} href={`/collections/${c.id}`} className="tile">
            <div className="body" style={{ padding: 16 }}>
              <span className="title">{c.name}</span>
              <span className="muted small">{c.cardCount} {c.cardCount === 1 ? "card" : "cards"}</span>
              <span className="badges"><span className="badge">{c.isPublic ? "Public" : "Private"}</span></span>
            </div>
          </Link>
        ))}
      </div>
      <CollectionCreateForm />
    </div>
  );
}
