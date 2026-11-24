import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  authConfig,
  authConfigError,
  cookieOptions,
  createSessionToken,
  passwordMatches,
} from "@/lib/session";
import { consume, reset } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";

const MAX_BODY_BYTES = 1024;

// Bruteforce-Bremse:
//  - pro IP: 5 Fehlversuche / 15 Minuten
//  - global: 50 Fehlversuche / Stunde (gegen verteilte Angriffe über viele IPs)
const PER_IP = { max: 5, windowSeconds: 15 * 60 };
const GLOBAL = { max: 50, windowSeconds: 60 * 60 };

function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: `Zu viele Versuche. Bitte in ${Math.ceil(retryAfter / 60)} Min. erneut probieren.` },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

export async function POST(req: NextRequest) {
  const cfg = authConfig();
  if (!cfg.ok) {
    return NextResponse.json({ error: authConfigError(cfg.reason) }, { status: 503 });
  }

  const ip = clientIp(req);
  const ipKey = `login:ip:${ip}`;

  // Versuch VOR der Passwortprüfung zählen, damit parallele Requests nicht durchrutschen
  let limit;
  try {
    limit = await consume([
      { key: ipKey, ...PER_IP },
      { key: "login:global", ...GLOBAL },
    ]);
  } catch (err) {
    console.error("rate limiter failed:", err);
    // Fail-closed: ohne funktionierenden Limiter kein Login
    return NextResponse.json({ error: "Login vorübergehend nicht möglich" }, { status: 503 });
  }
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);

  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Anfrage zu groß" }, { status: 413 });
  }

  let password: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Anfrage zu groß" }, { status: 413 });
    }
    password = (JSON.parse(text) as { password?: unknown })?.password;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  // Zusätzliche Verzögerung mit Zufallsanteil (erschwert Timing-Analyse & Bruteforce)
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

  if (typeof password !== "string" || !(await passwordMatches(password, cfg.password))) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }

  // Erfolgreich: IP-Zähler zurücksetzen (globaler Zähler läuft regulär ab)
  await reset(ipKey).catch(() => {});

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, await createSessionToken(cfg.password), {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
