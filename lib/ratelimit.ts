import { getRedis } from "./store";

/**
 * Einfacher Fixed-Window-Rate-Limiter gegen Passwort-Bruteforce.
 * - Mit Upstash: Zähler in Redis (gilt über alle Serverless-Instanzen hinweg).
 * - Ohne Upstash (lokal): Zähler im Prozessspeicher.
 */

const memory = new Map<string, { count: number; resetAt: number }>();

export interface Limit {
  key: string;
  max: number;
  windowSeconds: number;
}

export interface LimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

async function hit(limit: Limit): Promise<LimitResult> {
  const redis = getRedis();
  const fullKey = `finanz:rl:${limit.key}`;
  if (redis) {
    const count = await redis.incr(fullKey);
    if (count === 1) await redis.expire(fullKey, limit.windowSeconds);
    let ttl = await redis.ttl(fullKey);
    if (ttl < 0) {
      // Absicherung, falls expire nach incr fehlgeschlagen ist
      await redis.expire(fullKey, limit.windowSeconds);
      ttl = limit.windowSeconds;
    }
    return { allowed: count <= limit.max, retryAfterSeconds: ttl };
  }

  const now = Date.now();
  if (memory.size > 10_000) {
    for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
  }
  const entry = memory.get(fullKey);
  if (!entry || entry.resetAt <= now) {
    memory.set(fullKey, { count: 1, resetAt: now + limit.windowSeconds * 1000 });
    return { allowed: 1 <= limit.max, retryAfterSeconds: limit.windowSeconds };
  }
  entry.count++;
  return {
    allowed: entry.count <= limit.max,
    retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
  };
}

/** Zählt einen Versuch gegen alle Limits; blockiert, wenn eines überschritten ist. */
export async function consume(limits: Limit[]): Promise<LimitResult> {
  let worst: LimitResult = { allowed: true, retryAfterSeconds: 0 };
  for (const l of limits) {
    const r = await hit(l);
    if (!r.allowed && r.retryAfterSeconds >= worst.retryAfterSeconds) {
      worst = { allowed: false, retryAfterSeconds: r.retryAfterSeconds };
    }
  }
  return worst;
}

export async function reset(key: string): Promise<void> {
  const fullKey = `finanz:rl:${key}`;
  const redis = getRedis();
  if (redis) await redis.del(fullKey);
  else memory.delete(fullKey);
}
