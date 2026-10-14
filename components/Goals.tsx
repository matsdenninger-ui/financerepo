"use client";

import { useState } from "react";
import { eur, parseAmount, pct } from "@/lib/format";
import { Goal } from "@/lib/types";

interface Props {
  goals: Goal[];
  onChange: (goals: Goal[]) => void;
}

function ring(p: number): { dash: string; color: string } {
  const c = 2 * Math.PI * 15.5;
  const filled = (Math.min(p, 100) / 100) * c;
  return {
    dash: `${filled} ${c - filled}`,
    color: p >= 100 ? "var(--accent)" : "#a78bfa",
  };
}

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
          ? {
              ...g,
              saved: Math.min(
                g.target,
                Math.round((g.saved + amount) * 100) / 100
              ),
            }
          : g
      )
    );
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold">Sparziele</h2>

      <ul className="mt-4 space-y-4">
        {goals.length === 0 && (
          <li className="py-4 text-sm text-zinc-600">
            Führerschein, Umzug, Notgroschen — leg los.
          </li>
        )}
        {goals.map((g) => {
          const p = pct(g.saved, g.target);
          const left = Math.max(0, g.target - g.saved);
          const r = ring(p);
          return (
            <li key={g.id} className="group flex items-center gap-4 rounded-xl bg-white/[0.03] p-3">
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                className="shrink-0 -rotate-90"
              >
                <circle cx="20" cy="20" r="15.5" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
                <circle
                  cx="20"
                  cy="20"
                  r="15.5"
                  fill="none"
                  stroke={r.color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={r.dash}
                  className="transition-all"
                />
              </svg>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-zinc-100">
                    {g.name}
                  </span>
                  <button
                    onClick={() => onChange(goals.filter((x) => x.id !== g.id))}
                    className="shrink-0 text-zinc-700 opacity-0 transition group-hover:opacity-100 hover:text-rose-400"
                    aria-label={`${g.name} löschen`}
                  >
                    ✕
                  </button>
                </div>
                <p className="num mt-0.5 text-xs text-zinc-500">
                  {eur(g.saved)} / {eur(g.target)} · {p} %
                  {p >= 100 && <span style={{ color: "var(--accent)" }}> · geschafft 🎉</span>}
                </p>
                {p < 100 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    {[10, 25, 50].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => deposit(g.id, amt)}
                        className="num rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-zinc-300 transition hover:bg-white/10"
                      >
                        +{amt}
                      </button>
                    ))}
                    <span className="ml-auto text-[11px] text-zinc-600">
                      noch {eur(left)}
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <form onSubmit={add} className="mt-4 grid grid-cols-2 gap-2">
        <input
          className="field col-span-2"
          placeholder="Ziel (z. B. Führerschein)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="field num"
          inputMode="decimal"
          placeholder="Ziel €"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <button type="submit" className="ghost">
          Ziel anlegen
        </button>
      </form>
      {error && (
        <p className="mt-2 text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </section>
  );
}
