"use client";

import { useState } from "react";
import { dayLabel, eur, parseAmount, todayISO } from "@/lib/format";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Tx,
  TxType,
} from "@/lib/types";

interface Props {
  transactions: Tx[];
  onAdd: (tx: Tx) => void;
  onDelete: (id: string) => void;
}

const inputCls =
  "w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500";

export default function Transactions({ transactions, onAdd, onDelete }: Props) {
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cats = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const effCats: string[] = [...cats];

  const sorted = [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)
  );

  function add(e: React.FormEvent) {
    e.preventDefault();
    const val = parseAmount(amount);
    if (!Number.isFinite(val) || val <= 0) {
      setError("Bitte einen gültigen Betrag eingeben (z. B. 12,50)");
      return;
    }
    onAdd({
      id: crypto.randomUUID(),
      date,
      amount: val,
      type,
      category: category || cats[0],
      note: note.trim() || undefined,
    });
    setAmount("");
    setNote("");
    setError(null);
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <h2 className="text-sm font-semibold text-slate-300">🧾 Transaktionen</h2>

      <form onSubmit={add} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
        <div className="col-span-2 flex rounded-lg border border-slate-700 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setType("expense");
              setCategory("");
            }}
            className={`flex-1 px-2 py-2 text-sm font-medium transition ${
              type === "expense" ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-400"
            }`}
          >
            − Ausgabe
          </button>
          <button
            type="button"
            onClick={() => {
              setType("income");
              setCategory("");
            }}
            className={`flex-1 px-2 py-2 text-sm font-medium transition ${
              type === "income" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
            }`}
          >
            + Einnahme
          </button>
        </div>
        <input
          className={inputCls}
          inputMode="decimal"
          placeholder="Betrag €"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select
          className={inputCls}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {effCats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            className={inputCls}
            placeholder="Notiz (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Hinzufügen
          </button>
        </div>
      </form>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}

      <ul className="mt-4 divide-y divide-slate-800">
        {sorted.length === 0 && (
          <li className="py-6 text-center text-sm text-slate-500">
            Noch nichts erfasst — oben eintragen! ✍️
          </li>
        )}
        {sorted.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="w-12 shrink-0 text-slate-400">{dayLabel(t.date)}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                t.type === "expense"
                  ? "bg-rose-500/10 text-rose-300"
                  : "bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {t.category}
            </span>
            <span className="min-w-0 flex-1 truncate text-slate-300">
              {t.note ?? "—"}
            </span>
            <span
              className={`shrink-0 font-semibold ${
                t.type === "expense" ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {t.type === "expense" ? "−" : "+"}
              {eur(t.amount)}
            </span>
            <button
              onClick={() => onDelete(t.id)}
              aria-label="Löschen"
              className="shrink-0 rounded p-1 text-slate-500 transition hover:bg-slate-800 hover:text-rose-400"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
