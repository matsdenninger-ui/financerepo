"use client";

import { useState } from "react";
import { eur, parseAmount } from "@/lib/format";
import { Sub } from "@/lib/types";

interface Props {
  subs: Sub[];
  onChange: (subs: Sub[]) => void;
}

const inputCls =
  "w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500";

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
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        amount: val,
        day: d,
        kind,
        active: true,
      },
    ]);
    setName("");
    setAmount("");
    setError(null);
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <h2 className="text-sm font-semibold text-slate-300">
        🔁 Abos &amp; Fixkosten
      </h2>

      <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-800/60 p-3">
        <div>
          <p className="text-xs uppercase text-slate-400">pro Monat</p>
          <p className="text-xl font-bold text-cyan-300">{eur(monthly)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Abos pro Jahr 👀</p>
          <p className="text-xl font-bold text-cyan-300">
            {eur(aboOnly * 12)}
          </p>
        </div>
      </div>

      <ul className="mt-3 divide-y divide-slate-800">
        {subs.length === 0 && (
          <li className="py-4 text-sm text-slate-500">
            Noch keine Einträge — trag Spotify &amp; Co. ein und sieh, was du
            monatlich fest verplanst.
          </li>
        )}
        {subs.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
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
              className="h-4 w-4 accent-emerald-500"
              aria-label={`${s.name} aktiv`}
            />
            <span className={s.active ? "" : "text-slate-500 line-through"}>
              {s.kind === "fixed" ? "🏠" : "🔁"} {s.name}
            </span>
            <span className="text-xs text-slate-500">am {s.day}.</span>
            <span className="ml-auto font-semibold text-slate-200">
              {eur(s.amount)}
            </span>
            <button
              onClick={() => onChange(subs.filter((x) => x.id !== s.id))}
              className="text-slate-500 transition hover:text-rose-400"
              aria-label={`${s.name} löschen`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-3 grid grid-cols-4 gap-2">
        <input
          className={`${inputCls} col-span-2`}
          placeholder="Name (z. B. Spotify)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={inputCls}
          inputMode="decimal"
          placeholder="€/Monat"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className={inputCls}
          inputMode="numeric"
          placeholder="Tag 1-28"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
        <select
          className={`${inputCls} col-span-2`}
          value={kind}
          onChange={(e) => setKind(e.target.value as "subscription" | "fixed")}
        >
          <option value="subscription">Abo (Unterhaltung/Service)</option>
          <option value="fixed">Fixe Kosten (Miete, Handy…)</option>
        </select>
        <button
          type="submit"
          className="col-span-2 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:bg-slate-600"
        >
          Hinzufügen
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
      <p className="mt-2 text-[11px] leading-4 text-slate-500">
        Tipp: Auch nach dem Abbuchen trotzdem als Ausgabe buchen — hier fehlt nur die Übersicht deiner festen Lasten.
      </p>
    </section>
  );
}
