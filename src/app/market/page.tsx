import { listListings } from "@/lib/repo";
import { CardTile } from "@/components/CardTile";
import { DISCLAIMER } from "@/lib/site";

export const metadata = { title: "Market" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; listing?: string }> };

export default async function MarketPage({ searchParams }: Props) {
  const { q = "", listing = "" } = await searchParams;
  const cards = listListings({ q, listing: listing === "sale" || listing === "trade" ? (listing as "sale" | "trade") : "any" });
  return (
    <div>
      <h1>Market</h1>
      <div className="notice">{DISCLAIMER}</div>
      <form className="filters" method="get">
        <div className="field">
          <label htmlFor="q">Search</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Player, team, set, number..." />
        </div>
        <div className="field">
          <label htmlFor="listing">Show</label>
          <select id="listing" name="listing" defaultValue={listing}>
            <option value="">For sale and trade</option>
            <option value="sale">For sale</option>
            <option value="trade">For trade</option>
          </select>
        </div>
        <button className="btn" type="submit">Filter</button>
      </form>
      {cards.length === 0 ? (
        <p className="muted">Nothing listed yet.</p>
      ) : (
        <div className="tiles">{cards.map((card) => <CardTile key={card.id} card={card} showOwner />)}</div>
      )}
    </div>
  );
}
