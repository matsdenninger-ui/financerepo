import type { NextRequest } from "next/server";

/**
 * Client-IP ermitteln. Auf Vercel werden x-real-ip / x-forwarded-for von der
 * Plattform gesetzt und überschrieben (nicht vom Client fälschbar).
 */
export function clientIp(req: NextRequest): string {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return ip.slice(0, 64).replace(/[^0-9a-fA-F:.]/g, "") || "unknown";
}

/**
 * CSRF-Schutz für zustandsändernde Requests: Origin (bzw. Sec-Fetch-Site)
 * muss zur eigenen Seite gehören.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;

  const origin = req.headers.get("origin");
  if (!origin) {
    // Moderne Browser senden bei fetch-POST/PUT immer Origin. Fehlt er UND
    // Sec-Fetch-Site, ist es kein Browser-Request → für CSRF irrelevant,
    // aber wir sind trotzdem strikt.
    return site === "same-origin";
  }
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}
