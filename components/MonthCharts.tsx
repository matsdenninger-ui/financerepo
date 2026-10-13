"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY_COLORS } from "@/lib/types";
import { eur, monthLabel, shiftMonth } from "@/lib/format";
import { Tx } from "@/lib/types";

interface Props {
  data: Pick<Tx, "date" | "amount" | "type" | "category">[];
  month: string;
}

export default function MonthCharts({ data, month }: Props) {
  // Donut: Ausgaben des Monats nach Kategorie
  const byCat = new Map<string, number>();
  for (const t of data) {
    if (t.type === "expense" && t.date.startsWith(month)) {
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
    }
  }
  const donut = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }));

  // Balken: letzten 6 Monate Einkommen vs. Ausgaben
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const bars = months.map((ym) => {
    let e = 0;
    let i = 0;
    for (const t of data) {
      if (!t.date.startsWith(ym)) continue;
      if (t.type === "expense") e += t.amount;
      else i += t.amount;
    }
    return {
      name: new Date(`${ym}-01T12:00:00`).toLocaleDateString("de-DE", {
        month: "short",
      }),
      Einkommen: Math.round(i * 100) / 100,
      Ausgaben: Math.round(e * 100) / 100,
    };
  });

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="text-sm font-semibold text-slate-300">
          🥯 Ausgaben in {monthLabel(month)}
        </h2>
        {donut.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">
            Noch keine Ausgaben in diesem Monat erfasst.
          </p>
        ) : (
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={2}
                >
                  {donut.map((d) => (
                    <Cell key={d.name} fill={CATEGORY_COLORS[d.name] ?? "#6b7280"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => eur(Number(value))}
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    color: "#e2e8f0",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="text-sm font-semibold text-slate-300">
          📊 Letzte 6 Monate
        </h2>
        <div className="mt-2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickFormatter={(v: number) => `${v} €`}
                width={56}
              />
              <Tooltip
                formatter={(value) => eur(Number(value))}
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: 8,
                  color: "#e2e8f0",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Einkommen" fill="#22c55e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Ausgaben" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
