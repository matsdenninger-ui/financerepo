import { NextRequest, NextResponse } from "next/server";
import { getData, setData, isUpstashConfigured } from "@/lib/store";
import { EXPENSE_CATEGORIES, FinanceData, INCOME_CATEGORIES } from "@/lib/types";


function isValidNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

const CATEGORIES: ReadonlySet<string> = new Set([
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
]);

/** Validiert mitgebrachte Daten gegen ein Whitelist-Schema, damit keine Schrott-Werte in die DB kommen */
function sanitize(input: unknown): FinanceData {
  const src = (input ?? {}) as Record<string, unknown>;
  // Frisches Objekt: EMPTY_DATA ist eine geteilte Modul-Konstante und darf nicht mutiert werden
  const out: FinanceData = { transactions: [], budgets: [], subs: [], goals: [] };

  if (Array.isArray(src.transactions)) {
    out.transactions = src.transactions
      .filter((t): t is Record<string, unknown> => {
        if (!t || typeof t !== "object") return false;
        const o = t as Record<string, unknown>;
        return (
          typeof o.id === "string" &&
          o.id.length <= 64 &&
          typeof o.date === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(o.date) &&
          isValidNumber(o.amount) &&
          (o.type === "income" || o.type === "expense") &&
          typeof o.category === "string" &&
          CATEGORIES.has(o.category)
        );
      })
      .slice(0, 5000)
      .map((t) => ({
        id: t.id as string,
        date: t.date as string,
        amount: t.amount as number,
        type: t.type as "income" | "expense",
        category: t.category as string,
        note: typeof t.note === "string" ? t.note.slice(0, 200) : undefined,
      }));
  }

  if (Array.isArray(src.budgets)) {
    out.budgets = src.budgets
      .filter((b): b is Record<string, unknown> => {
        if (!b || typeof b !== "object") return false;
        const o = b as Record<string, unknown>;
        return (
          typeof o.category === "string" &&
          CATEGORIES.has(o.category) &&
          isValidNumber(o.limit)
        );
      })
      .slice(0, 50)
      .map((b) => ({
        category: b.category as string,
        limit: b.limit as number,
      }));
  }

  if (Array.isArray(src.subs)) {
    out.subs = src.subs
      .filter((s): s is Record<string, unknown> => {
        if (!s || typeof s !== "object") return false;
        const o = s as Record<string, unknown>;
        return (
          typeof o.id === "string" &&
          o.id.length <= 64 &&
          typeof o.name === "string" &&
          o.name.length > 0 &&
          o.name.length <= 60 &&
          isValidNumber(o.amount) &&
          typeof o.day === "number" &&
          Number.isInteger(o.day) &&
          o.day >= 1 &&
          o.day <= 28 &&
          (o.kind === "subscription" || o.kind === "fixed") &&
          typeof o.active === "boolean"
        );
      })
      .slice(0, 100)
      .map((s) => ({
        id: s.id as string,
        name: s.name as string,
        amount: s.amount as number,
        day: s.day as number,
        kind: s.kind as "subscription" | "fixed",
        active: s.active as boolean,
      }));
  }

  if (Array.isArray(src.goals)) {
    out.goals = src.goals
      .filter((g): g is Record<string, unknown> => {
        if (!g || typeof g !== "object") return false;
        const o = g as Record<string, unknown>;
        return (
          typeof o.id === "string" &&
          o.id.length <= 64 &&
          typeof o.name === "string" &&
          o.name.length > 0 &&
          o.name.length <= 60 &&
          isValidNumber(o.target) &&
          isValidNumber(o.saved)
        );
      })
      .slice(0, 50)
      .map((g) => ({
        id: g.id as string,
        name: g.name as string,
        target: g.target as number,
        saved: g.saved as number,
        deadline:
          typeof g.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(g.deadline)
            ? g.deadline
            : undefined,
      }));
  }

  return out;
}

export async function GET() {
  if (!isUpstashConfigured() && process.env.VERCEL) {
    return NextResponse.json(
      { error: "Server-Datenbank nicht konfiguriert (UPSTASH_REDIS_REST_URL/TOKEN fehlen)" },
      { status: 503 }
    );
  }
  try {
    return NextResponse.json(await getData());
  } catch (err) {
    console.error("GET /api/data failed:", err);
    return NextResponse.json({ error: "Laden fehlgeschlagen" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!isUpstashConfigured() && process.env.VERCEL) {
    return NextResponse.json(
      { error: "Server-Datenbank nicht konfiguriert (UPSTASH_REDIS_REST_URL/TOKEN fehlen)" },
      { status: 503 }
    );
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }
  try {
    const data = sanitize(raw);
    await setData(data);
    return NextResponse.json(data);
  } catch (err) {
    console.error("PUT /api/data failed:", err);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
}
