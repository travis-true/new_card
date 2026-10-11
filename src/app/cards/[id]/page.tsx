import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCard, listCollections } from "@/lib/repo";
import { CardEditor } from "@/components/CardEditor";
import { cardTitle } from "@/components/CardTile";
import { DISCLAIMER } from "@/lib/site";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const card = getCard(Number((await params).id));
  return { title: card && card.collectionPublic ? cardTitle(card) : "Card" };
}

export default async function CardPage({ params }: Props) {
  const card = getCard(Number((await params).id));
  if (!card) notFound();
  const user = await getCurrentUser();
  const isOwner = user?.id === card.userId;
  if (!card.collectionPublic && !isOwner) notFound();

  const facts: [string, string][] = [
    ["Year", card.year], ["Brand", card.brand], ["Set", card.setName], ["Card number", card.cardNumber],
    ["Team", card.team], ["Sport", card.sport], ["Parallel", card.parallel], ["Grade", card.grade],
    ["Rookie", card.rookie ? "Yes" : ""],
  ];
  const listed = card.forSale || card.forTrade;

  return (
    <div>
      <p className="muted small">
        <Link href={`/collections/${card.collectionId}`}>{card.collectionName}</Link> by{" "}
        <Link href={`/u/${card.ownerUsername}`}>{card.ownerUsername}</Link>
      </p>
      <h1>{cardTitle(card)}</h1>
      <div className="detail">
        <div style={{ display: "grid", gap: 12 }}>
          {card.frontImageId && <img src={`/api/images/${card.frontImageId}`} alt={`Front of ${cardTitle(card)}`} />}
          {card.backImageId && <img src={`/api/images/${card.backImageId}`} alt={`Back of ${cardTitle(card)}`} />}
        </div>
        <div>
          <dl className="facts panel">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {card.notes && <p>{card.notes}</p>}

          {listed && (
            <div className="panel" data-testid="listing-panel">
              <div className="badges" style={{ marginTop: 0, marginBottom: 8 }}>
                {card.forSale && <span className="badge sale">For sale</span>}
                {card.forTrade && <span className="badge trade">For trade</span>}
              </div>
              {card.listingNote && <p>{card.listingNote}</p>}
              {!isOwner && (
                <>
                  {card.ownerContactLink ? (
                    <a className="btn btn-primary" href={card.ownerContactLink} rel="noopener noreferrer nofollow ugc" target="_blank">
                      Contact {card.ownerUsername}
                    </a>
                  ) : (
                    <p className="muted small">{card.ownerUsername} has not added a contact link yet.</p>
                  )}
                  <p className="muted small" style={{ marginTop: 12 }}>{DISCLAIMER}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {isOwner && (
        <CardEditor
          cardId={card.id}
          collectionId={card.collectionId}
          collections={listCollections(user!.id).map((c) => ({ id: c.id, name: c.name }))}
          initial={{
            player: card.player, year: card.year, brand: card.brand, setName: card.setName, cardNumber: card.cardNumber,
            team: card.team, sport: card.sport, parallel: card.parallel, grade: card.grade, rookie: card.rookie,
            notes: card.notes, forSale: card.forSale, forTrade: card.forTrade, listingNote: card.listingNote,
          }}
        />
      )}
    </div>
  );
}
