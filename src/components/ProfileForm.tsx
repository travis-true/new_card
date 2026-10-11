"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export function ProfileForm({ bio, contactLink }: { bio: string; contactLink: string }) {
  const [values, setValues] = useState({
    bio,
    contactLink: contactLink.startsWith("mailto:") ? contactLink.slice(7) : contactLink,
  });
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await api("/api/profile", "PATCH", values);
    setMessage(result.ok ? { kind: "success", text: "Profile saved" } : { kind: "error", text: result.error });
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="panel">
      <div className="field">
        <label htmlFor="p-bio">Bio</label>
        <textarea id="p-bio" value={values.bio} maxLength={300} onChange={(e) => setValues({ ...values, bio: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="p-contact">Contact link for trades and sales</label>
        <input
          id="p-contact"
          type="text"
          value={values.contactLink}
          maxLength={200}
          placeholder="you@example.com or https://instagram.com/yourname"
          onChange={(e) => setValues({ ...values, contactLink: e.target.value })}
        />
        <span className="muted small">
          Shown on your public profile and on cards you list for sale or trade. Use an address or page you are comfortable sharing publicly.
        </span>
      </div>
      {message && <p className={message.kind} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy}>Save profile</button>
    </form>
  );
}
