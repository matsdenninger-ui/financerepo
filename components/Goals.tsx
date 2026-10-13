"use client";

import { useState } from "react";
import { eur, parseAmount, pct } from "@/lib/format";
import { Goal } from "@/lib/types";

interface Props {
  goals: Goal[];
  onChange: (goals: Goal[]) => void;
}

const inputCls =
  "w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500";

export default function Goals({ goals, onChange }: Props) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const val = parseAmount(target);
    if (!name.trim() || !Number.isFinite(val) || val <= 0) {
      setError("Name und Zielbetrag > 0 nötig");
      return;
    }
    onChange([
      ...goals,
      { id: crypto.randomUUID(), name: name.trim(), target: val, saved: 0 },
    ]);
    setName("");
    setTarget("");
    setError(null);
  }

  function deposit(id: string, amount: number) {
    onChange(
      goals.map((g) =>
        g.id === id
          ? { ...g, saved: Math.min(g.target, Math.round((g.saved + amount) * 100) / 100) }
          : g
      )
    );
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <h2 className="text-sm font-semibold text-slate-300">
        🚀 Sparziele
      </h2>

      <ul className="mt-3 space-y-4">
        {goals.length === 0 && (
          <li className="py-3 text-sm text-slate-500">
            Führerschein? Erster Umzug? Notgroschen? Leg ein Ziel an! 🎯
          </li>
        )}
        {goals.map((g) => {
          const p = pct(g.saved, g.target);
          const left = Math.max(0, g.target - g.saved);
          return (
            <li key={g.id} className="rounded-xl bg-slate-800/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-200">{g.name}</span>
                <button
                  onClick={() => onChange(goals.filter((x) => x.id !== g.id))}
                  className="text-slate-500 transition hover:text-rose-400"
                  aria-label={`${g.name} löschen`}
                >
                  ✕
                </button>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {p >= 100 ? "🎉 Ziel erreicht!" : `${eur(g.saved)} von ${eur(g.target)} · noch ${eur(left)}`}
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${Math.min(p, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                {p < 100 && (
                  <>
                    <button
                      onClick={() => deposit(g.id, 10)}
                      className="rounded-full bg-slate-700 px-2.5 py-1 font-medium text-slate-200 transition hover:bg-slate-600"
                    >
                      +10 €
                    </button>
                    <button
                      onClick={() => deposit(g.id, 25)}
                      className="rounded-full bg-slate-700 px-2.5 py-1 font-medium text-slate-200 transition hover:bg-slate-600"
                    >
                      +25 €
                    </button>
                    <button
                      onClick={() => deposit(g.id, 50)}
                      className="rounded-full bg-slate-700 px-2.5 py-1 font-medium text-slate-200 transition hover:bg-slate-600"
                    >
                      +50 €
                    </button>
                    <span className="ml-auto text-slate-500">{p} %</span>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <form onSubmit={add} className="mt-4 grid grid-cols-2 gap-2">
        <input
          className={inputCls}
          placeholder="Zielname (z. B. Führerschein)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={inputCls}
          inputMode="decimal"
          placeholder="Zielbetrag €"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <button
          type="submit"
          className="col-span-2 rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
        >
          Ziel anlegen
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </section>
  );
}
