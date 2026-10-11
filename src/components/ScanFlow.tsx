"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, prepareImage } from "@/lib/client";
import { CardFields, emptyCard, type CardFormValues } from "./CardFields";

type CollectionOption = { id: number; name: string };

type ScanResponse = {
  frontImageId: string;
  backImageId: string | null;
  mode: "claude" | "mock" | "unavailable";
  identification: null | {
    player: string; year: string; brand: string; set_name: string; card_number: string; team: string;
    sport: string; parallel: string; rookie: boolean; grade: string; confidence: "high" | "medium" | "low"; notes: string;
  };
  identifyError: string | null;
};

function Capture({
  title, hint, file, onFile, testId,
}: { title: string; hint: string; file: File | null; onFile: (f: File | null) => void; testId: string }) {
  const camera = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  };

  return (
    <div className="capture">
      <h3>{title}</h3>
      {preview ? <img src={preview} alt={`${title} preview`} /> : <p className="muted small">{hint}</p>}
      <div className="btn-row" style={{ justifyContent: "center", marginTop: 0 }}>
        <button type="button" className="btn" onClick={() => camera.current?.click()}>Take photo</button>
        <button type="button" className="btn" onClick={() => upload.current?.click()}>Upload</button>
        {file && <button type="button" className="btn" onClick={() => onFile(null)}>Remove</button>}
      </div>
      <input ref={camera} className="hidden-input" type="file" accept="image/*" capture="environment" onChange={pick} tabIndex={-1} aria-label={`${title} camera`} />
      <input ref={upload} className="hidden-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={pick} tabIndex={-1} aria-label={`${title} file`} data-testid={testId} />
    </div>
  );
}

export function ScanFlow({ collections }: { collections: CollectionOption[] }) {
  const router = useRouter();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [values, setValues] = useState<CardFormValues>(emptyCard);
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? 0);

  async function identify() {
    if (!front) return;
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("front", await prepareImage(front), "front.jpg");
    if (back) form.append("back", await prepareImage(back), "back.jpg");
    try {
      const response = await fetch("/api/scan", { method: "POST", body: form });
      const data = (await response.json().catch(() => ({}))) as ScanResponse & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Scan failed");
        return;
      }
      const id = data.identification;
      setValues(
        id
          ? {
              ...emptyCard,
              player: id.player, year: id.year, brand: id.brand, setName: id.set_name, cardNumber: id.card_number,
              team: id.team, sport: id.sport, parallel: id.parallel, grade: id.grade, rookie: id.rookie,
            }
          : emptyCard,
      );
      setScan(data);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!scan) return;
    setBusy(true);
    setError("");
    const result = await api<{ id: number }>("/api/cards", "POST", {
      ...values,
      collectionId,
      frontImageId: scan.frontImageId,
      backImageId: scan.backImageId,
    });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(`/cards/${result.data.id}`);
    router.refresh();
  }

  function reset() {
    setScan(null);
    setFront(null);
    setBack(null);
    setValues(emptyCard);
    setError("");
  }

  if (!scan) {
    return (
      <div>
        <div className="capture-grid">
          <Capture title="Front of card" hint="Fill the frame with the card, flat and well lit." file={front} onFile={setFront} testId="front-input" />
          <Capture title="Back of card" hint="The back shows the year, set and card number. Recommended." file={back} onFile={setBack} testId="back-input" />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="btn-row">
          <button type="button" className="btn btn-primary" disabled={!front || busy} onClick={identify}>
            {busy ? "Identifying..." : "Identify card"}
          </button>
        </div>
      </div>
    );
  }

  const id = scan.identification;
  return (
    <div>
      <div className="capture-grid" style={{ marginBottom: 16 }}>
        <img src={`/api/images/${scan.frontImageId}`} alt="Front of card" style={{ width: "100%", maxHeight: 320, objectFit: "contain" }} />
        {scan.backImageId && (
          <img src={`/api/images/${scan.backImageId}`} alt="Back of card" style={{ width: "100%", maxHeight: 320, objectFit: "contain" }} />
        )}
      </div>

      {scan.identifyError && <div className="notice" role="status">{scan.identifyError}</div>}
      {id && (
        <div className="notice" role="status" data-testid="identification-banner">
          {scan.mode === "mock" ? "Demo identification (not read from your photo). " : ""}
          Confidence: <strong>{id.confidence}</strong>. {id.notes} Check the details below before saving.
        </div>
      )}

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Card details</h2>
        <CardFields values={values} onChange={setValues} />
        <div className="field">
          <label htmlFor="f-collection">Add to collection</label>
          <select id="f-collection" value={collectionId} onChange={(e) => setCollectionId(Number(e.target.value))}>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !collectionId}>
            {busy ? "Saving..." : "Save to collection"}
          </button>
          <button type="button" className="btn" onClick={reset} disabled={busy}>Start over</button>
        </div>
      </div>
    </div>
  );
}
