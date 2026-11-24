import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_NAME,
  authConfig,
  authConfigError,
  cookieOptions,
  verifySessionToken,
} from "./lib/session";
import { isSameOrigin } from "./lib/request";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // 1) CSRF: zustandsändernde API-Requests nur von der eigenen Seite
  if (isApi && !SAFE_METHODS.has(req.method) && !isSameOrigin(req)) {
    return NextResponse.json({ error: "Ungültige Herkunft" }, { status: 403 });
  }

  // 2) Fail-closed: ohne (sichere) Konfiguration gibt es keinen Zugriff.
  //    Lokal (next dev) ohne APP_PASSWORD bleibt alles offen – nur auf localhost.
  const cfg = authConfig();
  if (!cfg.ok) {
    if (process.env.NODE_ENV !== "production" && cfg.reason === "missing") {
      const res = NextResponse.next();
      res.headers.set("x-finance-warning", "no-password-set");
      return res;
    }
    const msg = authConfigError(cfg.reason);
    if (isApi) return NextResponse.json({ error: msg }, { status: 503 });
    return new NextResponse(msg, {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const loggedIn = await verifySessionToken(
    req.cookies.get(COOKIE_NAME)?.value,
    cfg.password
  );

  // 3) Login-Seite und Login-API sind ohne Session erreichbar
  if (pathname === "/login" || pathname === "/api/auth/login") {
    if (loggedIn && pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 4) Alles andere nur mit gültiger, nicht abgelaufener Session
  if (!loggedIn) {
    if (isApi) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL("/login", req.url));
    // Abgelaufenes/ungültiges Cookie entfernen
    if (req.cookies.has(COOKIE_NAME)) {
      res.cookies.set(COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 });
    }
    return res;
  }
  return NextResponse.next();
}

export const config = {
  // Alles außer statischen Build-Assets läuft durch den Proxy
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
