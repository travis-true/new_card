"use client";

import { SPORTS } from "@/lib/validation";

export type CardFormValues = {
  player: string;
  year: string;
  brand: string;
  setName: string;
  cardNumber: string;
  team: string;
  sport: string;
  parallel: string;
  grade: string;
  rookie: boolean;
  notes: string;
  forSale: boolean;
  forTrade: boolean;
  listingNote: string;
};

export const emptyCard: CardFormValues = {
  player: "", year: "", brand: "", setName: "", cardNumber: "", team: "", sport: "other",
  parallel: "", grade: "", rookie: false, notes: "", forSale: false, forTrade: false, listingNote: "",
};

type Props = { values: CardFormValues; onChange: (next: CardFormValues) => void };

export function CardFields({ values, onChange }: Props) {
  const set = <K extends keyof CardFormValues>(key: K, value: CardFormValues[K]) =>
    onChange({ ...values, [key]: value });
  const text = (key: keyof CardFormValues, label: string, id: string) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" value={values[key] as string} onChange={(e) => set(key, e.target.value as never)} />
    </div>
  );

  return (
    <>
      <div className="form-grid">
        {text("player", "Player", "f-player")}
        {text("team", "Team", "f-team")}
        {text("year", "Year", "f-year")}
        {text("brand", "Brand", "f-brand")}
        {text("setName", "Set", "f-set")}
        {text("cardNumber", "Card number", "f-number")}
        {text("parallel", "Parallel / variant", "f-parallel")}
        {text("grade", "Grade (if slabbed)", "f-grade")}
        <div className="field">
          <label htmlFor="f-sport">Sport</label>
          <select id="f-sport" value={values.sport} onChange={(e) => set("sport", e.target.value)}>
            {SPORTS.map((s) => (
              <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={values.rookie} onChange={(e) => set("rookie", e.target.checked)} />
          Rookie card
        </label>
      </div>
      <div className="field">
        <label htmlFor="f-notes">Notes</label>
        <textarea id="f-notes" value={values.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} />
      </div>
      <fieldset style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 14px", margin: "0 0 12px" }}>
        <legend className="small" style={{ fontWeight: 600 }}>Listing (optional)</legend>
        <label className="check">
          <input type="checkbox" checked={values.forSale} onChange={(e) => set("forSale", e.target.checked)} />
          For sale
        </label>
        <label className="check">
          <input type="checkbox" checked={values.forTrade} onChange={(e) => set("forTrade", e.target.checked)} />
          For trade
        </label>
        <div className="field">
          <label htmlFor="f-listing-note">Listing note</label>
          <input
            id="f-listing-note"
            type="text"
            value={values.listingNote}
            maxLength={200}
            placeholder="e.g. Looking for offers, or trade for a rookie card"
            onChange={(e) => set("listingNote", e.target.value)}
          />
          <span className="muted small">
            Shown publicly if the collection is public. Deals happen off-site, at your own risk. Add a contact link in Settings.
          </span>
        </div>
      </fieldset>
    </>
  );
}
