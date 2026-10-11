import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserByUsername, listCollections, listPublicListingsByUser } from "@/lib/repo";
import { CardTile } from "@/components/CardTile";
import { DISCLAIMER } from "@/lib/site";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: (await params).username };
}

export default async function ProfilePage({ params }: Props) {
  const user = getUserByUsername((await params).username);
  if (!user) notFound();
  const collections = listCollections(user.id, true);
  const listings = listPublicListingsByUser(user.id);
  return (
    <div>
      <h1>{user.username}</h1>
      {user.bio && <p>{user.bio}</p>}
      {user.contactLink && (
        <p>
          <a className="btn" href={user.contactLink} rel="noopener noreferrer nofollow ugc" target="_blank">Contact {user.username}</a>
        </p>
      )}

      <h2>Collections</h2>
      {collections.length === 0 ? (
        <p className="muted">No public collections.</p>
      ) : (
        <div className="tiles" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {collections.map((c) => (
            <Link key={c.id} href={`/collections/${c.id}`} className="tile">
              <div className="body" style={{ padding: 16 }}>
                <span className="title">{c.name}</span>
                <span className="muted small">{c.cardCount} {c.cardCount === 1 ? "card" : "cards"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <h2>For sale or trade</h2>
      {listings.length === 0 ? (
        <p className="muted">Nothing listed.</p>
      ) : (
        <>
          <div className="notice">{DISCLAIMER}</div>
          <div className="tiles">{listings.map((card) => <CardTile key={card.id} card={card} />)}</div>
        </>
      )}
    </div>
  );
}
