import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { countCards, listCollections, recentCards } from "@/lib/repo";
import { CardTile } from "@/components/CardTile";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="hero">
        <h1>Scan a sports card. Know what it is.</h1>
        <p className="muted">
          Photograph the front and back of a card and CardScout identifies the player, year, set and number. Build collections and
          share what you have for sale or trade.
        </p>
        <div className="btn-row">
          <Link className="btn btn-primary" href="/signup">Create a free account</Link>
          <Link className="btn" href="/market">Browse the market</Link>
        </div>
      </div>
    );
  }
  const recent = recentCards(user.id, 8);
  return (
    <div>
      <h1>Welcome back, {user.username}</h1>
      <p className="muted">
        {countCards(user.id)} cards across {listCollections(user.id).length} collections.
      </p>
      <div className="btn-row" style={{ marginBottom: 24 }}>
        <Link className="btn btn-primary" href="/scan">Scan a card</Link>
        <Link className="btn" href="/collections">My collections</Link>
      </div>
      {recent.length > 0 && (
        <>
          <h2>Recently added</h2>
          <div className="tiles">{recent.map((card) => <CardTile key={card.id} card={card} />)}</div>
        </>
      )}
    </div>
  );
}
