import { eur } from "@/lib/format";

interface Props {
  income: number;
  expenses: number;
  fixeAnteil: number;
}

export default function SummaryCards({ income, expenses, fixeAnteil }: Props) {
  const saldo = income - expenses;
  const quote = income > 0 ? Math.round((saldo / income) * 100) : 0;

  const dot = (color: string) => (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{ background: color }}
    />
  );

  const cards = [
    {
      label: "Einkommen",
      value: eur(income),
      color: "var(--accent)",
      footer: null,
    },
    {
      label: "Ausgaben",
      value: eur(expenses),
      color: "var(--danger)",
      footer: null,
    },
    {
      label: "Übrig",
      value: eur(saldo),
      color: saldo >= 0 ? "#fafafa" : "var(--danger)",
      footer: `Fixverpflichtungen: ${eur(fixeAnteil)}/Monat`,
    },
    {
      label: "Sparquote",
      value: `${quote} %`,
      color: quote >= 20 ? "var(--accent)" : quote >= 10 ? "#fbbf24" : "var(--danger)",          footer:
        quote >= 20
          ? "Stark — weiter so 💪"
          : `20 %-Ziel: ${eur(Math.round(income * 0.2))} monatlich`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-5">
          <div className="label flex items-center gap-2">
            {dot(c.color)}
            {c.label}
          </div>
          <p className="mt-3 text-3xl font-semibold num" style={{ color: c.color }}>
            {c.value}
          </p>
          {c.footer && (
            <p className="mt-2 text-xs text-zinc-500">{c.footer}</p>
          )}
        </div>
      ))}
    </div>
  );
}
