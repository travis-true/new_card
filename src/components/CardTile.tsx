import Link from "next/link";
import type { Card } from "@/lib/repo";

export function cardTitle(card: Pick<Card, "player" | "year" | "setName" | "brand">): string {
  return card.player || [card.year, card.brand, card.setName].filter(Boolean).join(" ") || "Untitled card";
}

export function CardTile({ card, showOwner = false }: { card: Card; showOwner?: boolean }) {
  const subtitle = [card.year, card.brand, card.setName].filter(Boolean).join(" ");
  return (
    <Link href={`/cards/${card.id}`} className="tile">
      {card.frontImageId ? (
        <img src={`/api/images/${card.frontImageId}`} alt={`Front of ${cardTitle(card)}`} loading="lazy" />
      ) : (
        <div className="noimg" />
      )}
      <div className="body">
        <span className="title">{cardTitle(card)}</span>
        {subtitle && <span className="muted small">{subtitle}</span>}
        {(card.parallel || card.grade || card.rookie) && (
          <span className="muted small">{[card.parallel, card.grade, card.rookie ? "RC" : ""].filter(Boolean).join(" · ")}</span>
        )}
        {showOwner && <span className="muted small">by {card.ownerUsername}</span>}
        {(card.forSale || card.forTrade) && (
          <span className="badges">
            {card.forSale && <span className="badge sale">For sale</span>}
            {card.forTrade && <span className="badge trade">For trade</span>}
          </span>
        )}
      </div>
    </Link>
  );
}
