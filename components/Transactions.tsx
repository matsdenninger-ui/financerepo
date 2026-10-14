"use client";

import { useState } from "react";
import { dayLabel, eur, parseAmount, todayISO } from "@/lib/format";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, Tx, TxType } from "@/lib/types";

interface Props {
  transactions: Tx[];
  onAdd: (tx: Tx) => void;
  onDelete: (id: string) => void;
}

export default function Transactions({
  transactions,
  onAdd,
  onDelete,
}: Props) {
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
      setError("Betrag wie 12,50 eintragen");
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

  const sum = transactions.reduce(
    (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
    0
  );

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Buchungen</h2>
        <span className="num text-xs text-zinc-500">
          {sorted.length} {sorted.length === 1 ? "Buchung" : "Buchungen"} · Saldo{" "}
          <span
            style={{ color: sum >= 0 ? "var(--accent)" : "var(--danger)" }}
            className="font-medium"
          >
            {sum >= 0 ? "+" : ""}
            {eur(sum)}
          </span>
        </span>
      </div>

      <form onSubmit={add} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-12">
        <div className="col-span-2 flex rounded-xl border border-white/10 p-1 sm:col-span-2">
          <button
            type="button"
            onClick={() => {
              setType("expense");
              setCategory("");
            }}
            className={`seg flex-1 ${type === "expense" ? "active" : ""}`}
            style={
              type === "expense"
                ? { background: "rgba(251,113,133,0.15)", color: "var(--danger)" }
                : undefined
            }
          >
            −
          </button>
          <button
            type="button"
            onClick={() => {
              setType("income");
              setCategory("");
            }}
            className={`seg flex-1 ${type === "income" ? "active" : ""}`}
            style={
              type === "income"
                ? { background: "rgba(52,211,153,0.15)", color: "var(--accent)" }
                : undefined
            }
          >
            +
          </button>
        </div>
        <input
          className="field num sm:col-span-2"
          inputMode="decimal"
          placeholder="Betrag €"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select
          className="field sm:col-span-3"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {effCats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="field sm:col-span-3"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <div className="col-span-2 grid grid-cols-[1fr_auto] gap-2 sm:col-span-2">
          <input
            className="field"
            placeholder="Notiz"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit" className="btn-accent px-4">
            +
          </button>
        </div>
      </form>
      {error && <p className="mt-2 text-xs" style={{ color: "var(--danger)" }}>{error}</p>}

      <ul className="mt-2 divide-y divide-white/5">
        {sorted.length === 0 && (
          <li className="py-10 text-center text-sm text-zinc-600">
            Noch keine Buchungen in diesem Monat
          </li>
        )}
        {sorted.map((t) => (
          <li
            key={t.id}
            className="group flex items-center gap-3 py-2.5 text-sm"
          >
            <span className="w-11 shrink-0 num text-xs text-zinc-500">
              {dayLabel(t.date)}
            </span>
            <span className="min-w-0 flex-1 truncate text-zinc-200">
              {t.note ?? t.category}
              <span className="ml-2 text-xs text-zinc-500">{t.category}</span>
            </span>
            <span
              className={`shrink-0 num font-semibold ${
                t.type === "expense" ? "" : ""
              }`}
              style={{ color: t.type === "expense" ? "var(--danger)" : "var(--accent)" }}
            >
              {t.type === "expense" ? "−" : "+"}
              {eur(t.amount)}
            </span>
            <button
              onClick={() => onDelete(t.id)}
              aria-label="Löschen"
              className="shrink-0 rounded-md px-1.5 py-1 text-zinc-700 opacity-0 transition group-hover:opacity-100 hover:text-rose-400"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
