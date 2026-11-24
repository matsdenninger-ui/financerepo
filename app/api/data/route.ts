import { NextRequest, NextResponse } from "next/server";
import { getData, setData, isUpstashConfigured } from "@/lib/store";
import { EXPENSE_CATEGORIES, FinanceData, INCOME_CATEGORIES } from "@/lib/types";


/** Max. Größe des gespeicherten Dokuments (schützt vor Speicher-/Kosten-DoS) */
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_AMOUNT = 1_000_000_000;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function isValidNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= MAX_AMOUNT;
}

function isValidId(v: unknown): v is string {
  return typeof v === "string" && ID_RE.test(v);
}

/** Echtes Kalenderdatum im Format YYYY-MM-DD */
function isValidDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Steuerzeichen & unsichtbare Bidi-Zeichen entfernen, trimmen, kürzen */
function cleanText(v: string, max: number): string {
  return v
    .replace(/[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g, "")
    .trim()
    .slice(0, max);
}

function isValidName(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const c = cleanText(v, 60);
  return c.length > 0;
}

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

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
          isValidId(o.id) &&
          isValidDate(o.date) &&
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
        note: typeof t.note === "string" ? cleanText(t.note, 200) || undefined : undefined,
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
      .filter(
        (b, i, arr) => arr.findIndex((x) => x.category === b.category) === i
      )
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
          isValidId(o.id) &&
          isValidName(o.name) &&
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
        name: cleanText(s.name as string, 60),
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
          isValidId(o.id) &&
          isValidName(o.name) &&
          isValidNumber(o.target) &&
          isValidNumber(o.saved)
        );
      })
      .slice(0, 50)
      .map((g) => ({
        id: g.id as string,
        name: cleanText(g.name as string, 60),
        target: g.target as number,
        saved: g.saved as number,
        deadline:
          isValidDate(g.deadline)
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
      { status: 503, headers: NO_STORE }
    );
  }
  try {
    return NextResponse.json(await getData(), { headers: NO_STORE });
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
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) {
    return NextResponse.json({ error: "Content-Type muss application/json sein" }, { status: 415 });
  }
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Daten zu groß" }, { status: 413 });
  }
  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Daten zu groß" }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }
  try {
    const data = sanitize(raw);
    await setData(data);
    return NextResponse.json(data, { headers: NO_STORE });
  } catch (err) {
    console.error("PUT /api/data failed:", err);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
}
