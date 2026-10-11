"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const body =
      mode === "signup"
        ? { email: form.get("email"), username: form.get("username"), password: form.get("password") }
        : { email: form.get("email"), password: form.get("password") };
    const result = await api(`/api/auth/${mode}`, "POST", body);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push("/scan");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel" noValidate>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {mode === "signup" && (
        <div className="field">
          <label htmlFor="username">Username</label>
          <input id="username" name="username" type="text" autoComplete="username" required />
          <span className="muted small">3-20 letters, numbers or underscores. Shown on your public profile.</span>
        </div>
      )}
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
        />
        {mode === "signup" && <span className="muted small">At least 8 characters.</span>}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
