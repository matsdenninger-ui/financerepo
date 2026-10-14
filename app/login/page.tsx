"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
        return;
      }
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(body?.error ?? "Login fehlgeschlagen");
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold tracking-tight">
          finanz<span style={{ color: "var(--accent)" }}>.</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Privat und nur für dich. Passwort bitte.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          placeholder="Passwort"
          className="field mt-6 py-3"
        />
        {error && (
          <p className="mt-3 text-xs" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="btn-accent mt-4 w-full py-3 disabled:opacity-40"
        >
          {busy ? "Prüfe…" : "Los"}
        </button>
      </form>
    </main>
  );
}
