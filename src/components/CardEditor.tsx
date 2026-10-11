"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { CardFields, type CardFormValues } from "./CardFields";

type Props = {
  cardId: number;
  collectionId: number;
  collections: { id: number; name: string }[];
  initial: CardFormValues;
};

export function CardEditor({ cardId, collectionId, collections, initial }: Props) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [target, setTarget] = useState(collectionId);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await api(`/api/cards/${cardId}`, "PATCH", { ...values, collectionId: target });
    setMessage(result.ok ? { kind: "success", text: "Saved" } : { kind: "error", text: result.error });
    setBusy(false);
    if (result.ok) router.refresh();
  }

  async function remove() {
    if (!window.confirm("Delete this card and its photos? This cannot be undone.")) return;
    setBusy(true);
    const result = await api(`/api/cards/${cardId}`, "DELETE");
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      setBusy(false);
      return;
    }
    router.push(`/collections/${collectionId}`);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="panel">
      <h2 style={{ marginTop: 0 }}>Edit card</h2>
      <CardFields values={values} onChange={setValues} />
      <div className="field">
        <label htmlFor="f-collection">Collection</label>
        <select id="f-collection" value={target} onChange={(e) => setTarget(Number(e.target.value))}>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {message && <p className={message.kind} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
      <div className="btn-row">
        <button className="btn btn-primary" type="submit" disabled={busy}>Save changes</button>
        <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>Delete card</button>
      </div>
    </form>
  );
}
