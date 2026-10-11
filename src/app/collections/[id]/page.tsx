import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCollection, getUserById, listCardsInCollection } from "@/lib/repo";
import { CardTile } from "@/components/CardTile";
import { CollectionSettings } from "@/components/CollectionForms";
import { listCollections } from "@/lib/repo";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; listing?: string }>;
};

export default async function CollectionPage({ params, searchParams }: Props) {
  const collection = getCollection(Number((await params).id));
  if (!collection) notFound();
  const user = await getCurrentUser();
  const isOwner = user?.id === collection.userId;
  if (!collection.isPublic && !isOwner) notFound();

  const { q = "", listing = "" } = await searchParams;
  const filter = { q, listing: listing === "sale" || listing === "trade" ? (listing as "sale" | "trade") : undefined };
  const cards = listCardsInCollection(collection.id, filter);
  const owner = getUserById(collection.userId)!;

  return (
    <div>
      <div className="row">
        <h1>{collection.name}</h1>
        {isOwner && <Link className="btn btn-primary" href="/scan">Scan a card</Link>}
      </div>
      <p className="muted">
        {collection.description && <>{collection.description} · </>}
        by <Link href={`/u/${owner.username}`}>{owner.username}</Link> · {collection.cardCount}{" "}
        {collection.cardCount === 1 ? "card" : "cards"}
        {!collection.isPublic && " · Private"}
      </p>

      {isOwner && (
        <CollectionSettings
          id={collection.id}
          name={collection.name}
          description={collection.description}
          isPublic={collection.isPublic}
          canDelete={listCollections(user!.id).length > 1}
        />
      )}

      <form className="filters" method="get">
        <div className="field">
          <label htmlFor="q">Search</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Player, team, set, number..." />
        </div>
        <div className="field">
          <label htmlFor="listing">Show</label>
          <select id="listing" name="listing" defaultValue={listing}>
            <option value="">All cards</option>
            <option value="sale">For sale</option>
            <option value="trade">For trade</option>
          </select>
        </div>
        <button className="btn" type="submit">Filter</button>
      </form>

      {cards.length === 0 ? (
        <p className="muted">{q || listing ? "No cards match." : "No cards yet."}</p>
      ) : (
        <div className="tiles">{cards.map((card) => <CardTile key={card.id} card={card} />)}</div>
      )}
    </div>
  );
}
