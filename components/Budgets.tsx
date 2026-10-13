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

const inputCls =
  "w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-emerald-500";

export default function Budgets({ budgets, transactions, month, onChange }: Props) {
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <h2 className="flex items-center justify-between text-sm font-semibold text-slate-300">
        <span>🎯 Budgets (Monat)</span>
        {overLimit > 0 && (
          <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-300">
            {overLimit} über Limit ⚠️
          </span>
        )}
      </h2>

      <ul className="mt-3 space-y-3">
        {budgets.length === 0 && (
          <li className="py-3 text-sm text-slate-500">
            Noch keine Budgets geplant — gutes Geldmanagement braucht Grenzen 😉
          </li>
        )}
        {budgets.map((b) => {
          const spent = Math.round((spentByCat.get(b.category) ?? 0) * 100) / 100;
          const p = pct(spent, b.limit);
          const bar =
            p >= 100 ? "bg-rose-500" : p >= 80 ? "bg-yellow-400" : "bg-emerald-500";
          return (
            <li key={b.category}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: CATEGORY_COLORS[b.category] ?? "#6b7280" }}
                  />
                  {b.category}
                </span>
                <span className={p >= 100 ? "text-rose-400" : "text-slate-300"}>
                  {eur(spent)} / {eur(b.limit)}{" "}
                  <span className="text-xs text-slate-500">({p} %)</span>
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${bar}`}
                    style={{ width: `${Math.min(p, 100)}%` }}
                  />
                </div>
                <input
                  className="w-16 rounded bg-slate-800 border border-slate-700 px-1 py-0.5 text-right text-xs text-slate-300 outline-none focus:border-emerald-500"
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
                  className="text-slate-500 transition hover:text-rose-400"
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
            className={inputCls}
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="">Kategorie…</option>
            {freeCats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="Limit €"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:bg-slate-600"
          >
            +
          </button>
        </form>
      )}
    </section>
  );
}
