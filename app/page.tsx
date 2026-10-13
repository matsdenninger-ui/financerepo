"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SummaryCards from "@/components/SummaryCards";
import MonthCharts from "@/components/MonthCharts";
import Transactions from "@/components/Transactions";
import Budgets from "@/components/Budgets";
import Subs from "@/components/Subs";
import Goals from "@/components/Goals";
import {
  DEFAULT_BUDGETS,
  EMPTY_DATA,
  FinanceData,
  Tx,
  Budget,
  Sub,
  Goal,
} from "@/lib/types";
import { monthLabel, shiftMonth, todayISO, ymOf } from "@/lib/format";

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<FinanceData | null>(null);
  // new Date() nicht beim Prerender auwerten — monatig erst im Client setzen
  const [month, setMonth] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [failedStartBudgets, setFailedStartBudgets] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as FinanceData;
      // Beim allerersten Start sinnvolle Standard-Budgets vorschlagen
      if (body.budgets.length === 0 && body.transactions.length === 0) {
        setData({ ...body, budgets: DEFAULT_BUDGETS });
        setFailedStartBudgets(true);
      } else {
        setData(body);
      }
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    setMonth(ymOf(todayISO()));
    void load();
  }, [load]);

  // Erstart-Budgets persistieren, sobald Daten vorgemerkt sind
  useEffect(() => {
    if (data && failedStartBudgets && data.budgets.length > 0) {
      setFailedStartBudgets(false);
      void save(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, failedStartBudgets]);

  const save = useCallback(async (next: FinanceData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        alert(body?.error ?? "Speichern fehlgeschlagen");
      }
    } catch {
      alert("Speichern fehlgeschlagen (Netzwerk)");
    } finally {
      setSaving(false);
    }
  }, []);

  function update(mutator: (d: FinanceData) => FinanceData) {
    if (!data) return;
    const next = mutator(data);
    setData(next);
    void save(next);
  }

  const monthTx = (data?.transactions ?? []).filter((t) =>
    t.date.startsWith(month)
  );
  const income = monthTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expenses = monthTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const fixeAnteil = (data?.subs ?? [])
    .filter((s) => s.active)
    .reduce((s, x) => s + x.amount, 0);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500 animate-pulse">Lade dein Dashboard…</p>
      </main>
    );
  }
  if (status === "error" || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-rose-900/40 bg-slate-900 p-6 text-center">
          <p className="font-semibold text-rose-400">⚠️ Laden fehlgeschlagen</p>
          <p className="mt-2 text-sm text-slate-400">
            Netzwerk-Problem oder Server-Datenbank nicht erreichbar. Auf dem
            Server ist der Upstash-Speicher nötig (siehe Anleitung).
          </p>
          <button
            onClick={() => { void load(); }}
            className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Erneut versuchen
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">💚 Mein Finanz-Hub</h1>
          <p className="text-sm text-slate-400">
            {monthLabel(month)} · {saving ? "Speichere…" : "Gespeichert ✓"}
          </p>
        </div>
        <button
          onClick={() => { void logout(); }}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800"
        >
          Logout
        </button>
      </header>

      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm transition hover:bg-slate-800"
          aria-label="Vorheriger Monat"
        >
          ‹
        </button>
        <span className="font-semibold">{monthLabel(month)}</span>
        <button
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm transition hover:bg-slate-800"
          aria-label="Nächster Monat"
        >
          ›
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <SummaryCards income={income} expenses={expenses} fixeAnteil={fixeAnteil} />
        <MonthCharts data={data.transactions} month={month} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Transactions
              transactions={monthTx}
              onAdd={(tx) =>
                update((d) => ({ ...d, transactions: [...d.transactions, tx] }))
              }
              onDelete={(id) =>
                update((d) => ({
                  ...d,
                  transactions: d.transactions.filter((t) => t.id !== id),
                }))
              }
            />
          </div>
          <div className="space-y-4">
            <Budgets
              budgets={data.budgets}
              transactions={data.transactions}
              month={month}
              onChange={(budgets: Budget[]) => update((d) => ({ ...d, budgets }))}
            />
            <Subs subs={data.subs} onChange={(subs: Sub[]) => update((d) => ({ ...d, subs }))} />
            <Goals goals={data.goals} onChange={(goals: Goal[]) => update((d) => ({ ...d, goals }))} />
          </div>
        </div>

        <footer className="pt-4 text-center text-xs text-slate-600">
          Deine Daten liegen verschlüsselt in deinem privaten Upstash-Speicher 🔒
        </footer>
      </div>
    </main>
  );
}
