"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

const tooltipStyle = {
  background: "#131316",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  fontSize: 13,
  color: "#fafafa",
  boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
};

interface Props {
  data: Pick<Tx, "date" | "amount" | "type" | "category">[];
  month: string;
}

export default function MonthCharts({ data, month }: Props) {
  const byCat = new Map<string, number>();
  for (const t of data) {
    if (t.type === "expense" && t.date.startsWith(month)) {
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
    }
  }
  const donut = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));

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
      <section className="card p-5">
        <h2 className="label">Wo es hingeht</h2>
        {donut.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-600">
            Keine Ausgaben in {monthLabel(month)} — nice 👀
          </p>
        ) : (
          <div className="mt-2 grid h-56 grid-cols-1 items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="80%"
                  paddingAngle={3}
                  stroke="none"
                  cornerRadius={5}
                >
                  {donut.map((d) => (
                    <Cell
                      key={d.name}
                      fill={CATEGORY_COLORS[d.name] ?? "#52525b"}
                      opacity={0.9}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => eur(Number(value))}
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {donut.length > 0 && (
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {donut.slice(0, 8).map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-zinc-400">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: CATEGORY_COLORS[d.name] ?? "#52525b" }}
                />
                <span className="truncate">{d.name}</span>
                <span className="ml-auto num text-zinc-200">{eur(d.value)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="label">Letzte 6 Monate</h2>
        <div className="mt-2 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} barGap={6}>
              <CartesianGrid
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "#71717a", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 11 }}
                tickFormatter={(v: number) => `${v} €`}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                formatter={(value) => eur(Number(value))}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="Einkommen" fill="var(--accent)" radius={[6, 6, 6, 6]} maxBarSize={22} />
              <Bar dataKey="Ausgaben" fill="var(--danger)" radius={[6, 6, 6, 6]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex justify-center gap-5 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
            Einkommen
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--danger)" }} />
            Ausgaben
          </span>
        </div>
      </section>
    </div>
  );
}
