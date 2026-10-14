"use client";

import { useState } from "react";
import { eur, parseAmount, pct } from "@/lib/format";
import { Budget, CATEGORY_COLORS, EXPENSE_CATEGORIES, Tx } from "@/lib/types";

interface Props {
  budgets: Budget[];
  transactions: Tx[];
  month: string;
  onChange: (budgets: Budget[]) => void;
}

export default function Budgets({
  budgets,
  transactions,
  month,
  onChange,
}: Props) {
  const [cat, setCat] = useState("");
  const [limit, setLimit] = useState("");

  const spentByCat = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === "expense" && t.date.startsWith(month)) {
      spentByCat.set(t.category, (spentByCat.get(t.category) ?? 0) + t.amount);
    }
  }

  const freeCats = (EXPENSE_CATEGORIES as readonly string[]).filter(
    (c) => !budgets.some((b) => b.category === c)
  );

  function add(e: React.FormEvent) {
    e.preventDefault();
    const val = parseAmount(limit);
    if (!cat || !Number.isFinite(val) || val <= 0) return;
    onChange([...budgets, { category: cat, limit: val }]);
    setCat("");
    setLimit("");
  }

  const overLimit = budgets.filter(
    (b) => (spentByCat.get(b.category) ?? 0) > b.limit
  ).length;

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Budgets</h2>
        {overLimit > 0 ? (
          <span
            className="text-xs font-medium"
            style={{ color: "var(--danger)" }}
          >
            {overLimit} über Limit
          </span>
        ) : (
          <span className="text-xs text-zinc-600">
            {budgets.length} {budgets.length === 1 ? "Budget" : "Budgets"}
          </span>
        )}
      </div>

      <ul className="mt-4 space-y-4">
        {budgets.length === 0 && (
          <li className="py-4 text-sm text-zinc-600">
            Lege dein erstes Budget fest — Grenzen halten die frei.
          </li>
        )}
        {budgets.map((b) => {
          const spent =
            Math.round((spentByCat.get(b.category) ?? 0) * 100) / 100;
          const p = pct(spent, b.limit);
          const barColor =
            p >= 100 ? "var(--danger)" : p >= 80 ? "#fbbf24" : "var(--accent)";
          return (
            <li key={b.category}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-zinc-200">{b.category}</span>
                <span className="num text-xs text-zinc-500">
                  <span
                    className="font-medium"
                    style={{ color: p >= 100 ? "var(--danger)" : "#e4e4e7" }}
                  >
                    {eur(spent)}
                  </span>{" "}
                  / {eur(b.limit)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(p, 100)}%`,
                      background: barColor,
                    }}
                  />
                </div>
                <input
                  className="w-14 rounded-md bg-white/5 px-1.5 py-0.5 text-right num text-[11px] text-zinc-400 outline-none transition focus:bg-white/10 focus:text-zinc-100"
                  value={b.limit}
                  inputMode="decimal"
                  onChange={(e) => setLimit(e.target.value)}
                  onBlur={(e) => {
                    const val = parseAmount(e.target.value);
                    if (Number.isFinite(val) && val > 0) {
                      onChange(
                        budgets.map((x) =>
                          x.category === b.category ? { ...x, limit: val } : x
                        )
                      );
                    }
                  }}
                  aria-label={`Limit ${b.category} ändern`}
                />
                <button
                  onClick={() =>
                    onChange(budgets.filter((x) => x.category !== b.category))
                  }
                  className="text-zinc-700 transition hover:text-rose-400"
                  aria-label={`Budget ${b.category} löschen`}
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {freeCats.length > 0 && (
        <form onSubmit={add} className="mt-4 flex gap-2">
          <select
            className="field"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="">Kategorie wählen…</option>
            {freeCats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className="field num max-w-24"
            inputMode="decimal"
            placeholder="Limit €"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
          <button type="submit" className="ghost shrink-0">
            Hinzufügen
          </button>
        </form>
      )}
    </section>
  );
}
