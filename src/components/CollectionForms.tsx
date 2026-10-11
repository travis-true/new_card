"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function CollectionCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await api<{ id: number }>("/api/collections", "POST", { name, description, isPublic });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(`/collections/${result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel">
      <h2 style={{ marginTop: 0 }}>New collection</h2>
      <div className="field">
        <label htmlFor="c-name">Name</label>
        <input id="c-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
      </div>
      <div className="field">
        <label htmlFor="c-desc">Description</label>
        <input id="c-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
      </div>
      <label className="check">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        Public (visible on your profile)
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>Create collection</button>
    </form>
  );
}

type Props = { id: number; name: string; description: string; isPublic: boolean; canDelete: boolean };

export function CollectionSettings({ id, name, description, isPublic, canDelete }: Props) {
  const router = useRouter();
  const [values, setValues] = useState({ name, description, isPublic });
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await api(`/api/collections/${id}`, "PATCH", values);
    setMessage(result.ok ? { kind: "success", text: "Saved" } : { kind: "error", text: result.error });
    setBusy(false);
    if (result.ok) router.refresh();
  }

  async function remove() {
    if (!window.confirm("Delete this collection and every card in it? This cannot be undone.")) return;
    setBusy(true);
    const result = await api(`/api/collections/${id}`, "DELETE");
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      setBusy(false);
      return;
    }
    router.push("/collections");
    router.refresh();
  }

  return (
    <details className="panel">
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>Collection settings</summary>
      <form onSubmit={save} style={{ marginTop: 12 }}>
        <div className="field">
          <label htmlFor="cs-name">Name</label>
          <input id="cs-name" type="text" value={values.name} maxLength={60} onChange={(e) => setValues({ ...values, name: e.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="cs-desc">Description</label>
          <input id="cs-desc" type="text" value={values.description} maxLength={300} onChange={(e) => setValues({ ...values, description: e.target.value })} />
        </div>
        <label className="check">
          <input type="checkbox" checked={values.isPublic} onChange={(e) => setValues({ ...values, isPublic: e.target.checked })} />
          Public (visible on your profile and in the market)
        </label>
        {message && <p className={message.kind} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={busy}>Save settings</button>
          {canDelete && <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>Delete collection</button>}
        </div>
      </form>
    </details>
  );
}
