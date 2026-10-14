"use client";

import { useState } from "react";
import { eur, parseAmount } from "@/lib/format";
import { Sub } from "@/lib/types";

interface Props {
  subs: Sub[];
  onChange: (subs: Sub[]) => void;
}

export default function Subs({ subs, onChange }: Props) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("1");
  const [kind, setKind] = useState<"subscription" | "fixed">("subscription");
  const [error, setError] = useState<string | null>(null);

  const active = subs.filter((s) => s.active);
  const monthly = active.reduce((sum, s) => sum + s.amount, 0);
  const aboOnly = active
    .filter((s) => s.kind === "subscription")
    .reduce((sum, s) => sum + s.amount, 0);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const val = parseAmount(amount);
    const d = parseInt(day, 10);
    if (!name.trim() || !Number.isFinite(val) || val <= 0 || !(d >= 1 && d <= 28)) {
      setError("Name, Betrag > 0 und Fälligkeit 1–28 nötig");
      return;
    }
    onChange([
      ...subs,
      { id: crypto.randomUUID(), name: name.trim(), amount: val, day: d, kind, active: true },
    ]);
    setName("");
    setAmount("");
    setError(null);
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold">Fixe Lasten</h2>

      <div className="mt-3 flex items-baseline gap-5">
        <div>
          <p className="label">pro Monat</p>
          <p className="num text-2xl font-semibold" style={{ color: "#e4e4e7" }}>
            {eur(monthly)}
          </p>
        </div>
        <div>
          <p className="label">abos / jahr</p>
          <p className="num text-2xl font-semibold" style={{ color: "var(--danger)" }}>
            {eur(aboOnly * 12)}
          </p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-white/5">
        {subs.length === 0 && (
          <li className="py-4 text-sm text-zinc-600">
            Spotify, Gym, Handy — hier rein, damit du weißt, was fix verplant ist.
          </li>
        )}
        {subs.map((s) => (
          <li key={s.id} className="group flex items-center gap-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={s.active}
              onChange={(e) =>
                onChange(
                  subs.map((x) =>
                    x.id === s.id ? { ...x, active: e.target.checked } : x
                  )
                )
              }
              className="h-4 w-4 accent-emerald-400"
              aria-label={`${s.name} aktiv`}
            />
            <span className={`min-w-0 flex-1 truncate ${s.active ? "text-zinc-200" : "text-zinc-600 line-through"}`}>
              {s.name}
            </span>
            <span className="shrink-0 text-[11px] text-zinc-600">
              {s.kind === "fixed" ? "fix" : "abo"} · {s.day}.
            </span>
            <span className="num shrink-0 font-medium text-zinc-100">
              {eur(s.amount)}
            </span>
            <button
              onClick={() => onChange(subs.filter((x) => x.id !== s.id))}
              className="shrink-0 text-zinc-700 opacity-0 transition group-hover:opacity-100 hover:text-rose-400"
              aria-label={`${s.name} löschen`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-3 grid grid-cols-4 gap-2">
        <input
          className="field col-span-2"
          placeholder="Name (z. B. Spotify)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="field num"
          inputMode="decimal"
          placeholder="€/Mon."
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className="field num"
          inputMode="numeric"
          placeholder="Tag 1-28"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
        <select
          className="field col-span-2"
          value={kind}
          onChange={(e) => setKind(e.target.value as "subscription" | "fixed")}
        >
          <option value="subscription">Abo</option>
          <option value="fixed">Fixe Kosten</option>
        </select>
        <button type="submit" className="ghost col-span-2">
          Hinzufügen
        </button>
      </form>
      {error && (
        <p className="mt-2 text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <p className="mt-3 text-[11px] leading-4 text-zinc-600">
        Abgebuchte Kosten trotzdem als Ausgabe eintragen — hier fehlt nur der Überblick.
      </p>
    </section>
  );
}
