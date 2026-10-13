import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, expectedToken } from "./lib/session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const password = process.env.APP_PASSWORD;

  // Login-Seite und deren API sind immer erreichbar
  if (pathname === "/login" || pathname === "/api/auth/login") {
    // Bereits eingeloggt? Dann direkt aufs Dashboard.
    if (
      password &&
      req.cookies.get(COOKIE_NAME)?.value === (await expectedToken(password))
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!password) {
    // KEIN Passwort gesetzt: Zugriff erlauben, aber mit deutlichem Warnheader,
    // damit man auf Vercel nicht versehentlich ungeschützt veröffentlicht.
    const res = NextResponse.next();
    res.headers.set("x-finance-warning", "no-password-set");
    return res;
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token !== (await expectedToken(password))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)"],
};
