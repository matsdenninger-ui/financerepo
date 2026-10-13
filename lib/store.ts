import { Redis } from "@upstash/redis";
import { promises as fs } from "fs";
import path from "path";
import { EMPTY_DATA, FinanceData } from "./types";

const KEY = "finanz:daten";

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return new Redis({ url, token });
  return null;
}

export function isUpstashConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Entwicklungs-Fallback: lokale Datei, wenn keine Upstash-Credentials gesetzt sind.
 * Auf Vercel (ohne Dateisystem-Schreibrechte) wird data.json also ignoriert —
 * dort MUSS Upstash konfiguriert sein.
 */
async function localRead(): Promise<FinanceData | null> {
  try {
    const file = path.join(process.cwd(), ".data", "finanz.json");
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as FinanceData;
  } catch {
    return null;
  }
}

async function localWrite(data: FinanceData): Promise<void> {
  const dir = path.join(process.cwd(), ".data");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "finanz.json"),
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

export async function getData(): Promise<FinanceData> {
  const redis = getRedis();
  let raw: unknown = null;
  if (redis) {
    raw = (await redis.get(KEY)) ?? null;
  } else {
    raw = await localRead();
  }
  if (!raw || typeof raw !== "object") return EMPTY_DATA;
  const src = raw as Partial<FinanceData>;
  // Normalisieren: fehlende Felder ergänzen, damit Clients keine undefined-Arrays kriegen
  return {
    transactions: Array.isArray(src.transactions) ? src.transactions : [],
    budgets: Array.isArray(src.budgets) ? src.budgets : [],
    subs: Array.isArray(src.subs) ? src.subs : [],
    goals: Array.isArray(src.goals) ? src.goals : [],
  };
}

export async function setData(data: FinanceData): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(KEY, data);
    return;
  }
  await localWrite(data);
}
