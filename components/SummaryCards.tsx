import { eur } from "@/lib/format";

interface Props {
  income: number;
  expenses: number;
  fixeAnteil: number;
}

export default function SummaryCards({ income, expenses, fixeAnteil }: Props) {
  const saldo = income - expenses;
  const quote = income > 0 ? Math.round((saldo / income) * 100) : 0;

  const cards = [
    {
      label: "Einkommen",
      value: eur(income),
      tone: "text-emerald-400",
      icon: "💰",
    },
    {
      label: "Ausgaben",
      value: eur(expenses),
      tone: "text-rose-400",
      icon: "🧾",
    },
    {
      label: "Übrig / saldo",
      value: eur(saldo),
      tone: saldo >= 0 ? "text-sky-400" : "text-rose-500",
      icon: "⚖️",
    },
    {
      label: "Sparquote",
      value: `${quote} %`,
      tone: quote >= 20 ? "text-emerald-400" : quote >= 10 ? "text-yellow-400" : "text-rose-400",
      sub: quote < 20 ? "Ziel: ≥ 20 %" : "Stark! 💪",
      icon: "📈",
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              {c.label}
            </span>
            <span aria-hidden>{c.icon}</span>
          </div>
          <p className={`mt-2 text-2xl font-bold ${c.tone}`}>{c.value}</p>
          {"sub" in c && c.sub && (
            <p className="mt-1 text-xs text-slate-500">{c.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
