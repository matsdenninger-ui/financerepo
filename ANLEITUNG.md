# 💚 Mein Finanz-Hub

Persönliches Finanz-Dashboard — gebaut für dich (19 Jahre, €, komplett auf Deutsch):

| Bereich | Was es kann |
|---|---|
| 💰 Einkommen | Gehalt, Nebenjob, Geschenke + Sparquote-Schätzung |
| 🧾 Ausgaben | Kategorie, Datum, Notiz — Donut-Chart im Monatsvergleich |
| 🎯 Budgets | Limit pro Kategorie, Fortschrittsbalken, Warnung bei 80 % / 100 % |
| 🔁 Abos & Fixkosten | Spotify & Co. mit Monats- UND Jahressumme (Augen öffnen 👀) |
| 🚀 Sparziele | z. B. Führerschein mit Fortschrittsbalken + Einzahlungsknöpfe |
| 📊 Charts | Ausgabenverteilung + Einkommen/Ausgaben der letzten 6 Monate |

## Schnellstart lokal

```bash
npm install
cp .env.example .env.local   # Passwort eintragen (Upstash optional: ohne läuft ein lokaler Fallback in .data/)
npm run dev                  # → http://localhost:3000
```

## Daten & Sicherheit

- Daten liegen in **einem einzelnen JSON-Dokument** (`finanz:daten` in Upstash Redis).
- Lokaler Dev-Modus ohne Upstash speichert in `.data/finanz.json` (nicht committet, `.gitignore`).
- Auf Vercel MUSS Upstash konfiguriert sein (Vercel-Serverless hat kein dauerhaftes Dateisystem).

### Sicherheitsmaßnahmen

| Schutz | Wie |
|---|---|
| Login | Passwortvergleich in konstanter Laufzeit, Zufallsverzögerung |
| Bruteforce | max. 5 Fehlversuche / 15 Min. pro IP, 50 / Stunde global (über Upstash, gilt für alle Server-Instanzen) |
| Session | HMAC-signiertes Cookie mit Ablauf (7 Tage), `__Host-`-Präfix, `HttpOnly`, `Secure`, `SameSite=Strict` |
| Alle abmelden | `APP_PASSWORD` **oder** `SESSION_SECRET` ändern → alle Sessions sofort ungültig |
| Fail-closed | Fehlt Passwort/Secret oder ist das Passwort zu kurz, ist die App in Produktion komplett gesperrt (503) |
| CSRF | Schreibende API-Requests nur mit eigenem `Origin` / `Sec-Fetch-Site: same-origin` |
| Eingaben | Whitelist-Schema, echte Datumsprüfung, Längen-/Betragsgrenzen, Steuerzeichen werden entfernt, max. 2 MB |
| Browser | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, Permissions-Policy, `noindex` |
| Caching | API-Antworten `Cache-Control: no-store` (keine Finanzdaten in Proxies/CDN-Caches) |
| Abhängigkeiten | Next.js auf gepatchter Version, Dependabot prüft wöchentlich auf Sicherheitsupdates |

### Was DU noch tun solltest (kann der Code nicht für dich)

1. **Starkes Passwort**: mind. 12 Zeichen, besser eine Passphrase mit 4–5 zufälligen Wörtern. Nirgends sonst verwenden.
2. **`SESSION_SECRET` setzen**: `openssl rand -base64 48` → in Vercel als Environment Variable.
3. **2-Faktor-Login** bei GitHub, Vercel und Upstash aktivieren — wer dort reinkommt, kommt an alles.
4. **Repo privat lassen**, in GitHub unter *Settings → Code security* „Secret scanning“ und „Dependabot alerts“ einschalten.
5. **Keine Secrets committen**: `.env*` ist ignoriert, nur `.env.example` (ohne Werte) liegt im Repo.
6. **Upstash-Token** nie weitergeben; bei Verdacht in Upstash rotieren und in Vercel ersetzen.
7. Optional: **Vercel Deployment Protection** für Preview-Deployments einschalten.

## Deployment: Vercel + GitHub + Upstash (wichtige Reihenfolge)

1. **Upstash anlegen** (denn die DB ist dein Daten-Zuhause):
   - https://upstash.com → GitHub-Login → **Create Database**
   - Name z. B. `finanz-db`, Region z. B. `eu-central-1 (Frankfurt)`, Typ **Redis**
   - Danach unter *Details → REST API* die Werte aus **UPSTASH_REDIS_REST_URL** und **UPSTASH_REDIS_REST_TOKEN** kopieren.

2. **GitHub-Repo erstellen**:
   - Neues **privates** Repo (Finenzdaten gehören nicht öffentlich ins Netz).
   - Code pushen:
     ```bash
     git remote add origin https://github.com/<DEIN-NAME>/finanz-hub.git
     git branch -M main
     git push -u origin main
     ```

3. **Vercel-Projekt anlegen**:
   - https://vercel.com → **Add New → Project → Import** dieses Repo.
   - Framework-Erkennung: Next.js, keine extra Build-Settings nötig.
   - **Environment Variables** anlegen (für Production + Preview):
     - `APP_PASSWORD` = dein Dashboard-Passwort (mind. 12 Zeichen)
     - `SESSION_SECRET` = Zufallswert, z. B. aus `openssl rand -base64 48` (mind. 32 Zeichen)
     - `UPSTASH_REDIS_REST_URL` = von Upstash
     - `UPSTASH_REDIS_REST_TOKEN` = von Upstash
   - **Deploy**.

4. **Testen nach dem ersten Deploy**:
   - Seite öffnen → Login mit deinem APP_PASSWORD
   - Test-Eintrag → Seite neu laden → bleibt der Eintrag gespeichert? ⇒ passt.

## Architektur

```
Browser (React/Tailwind)
   │  fetch mit httpOnly-Session-Cookie
   ▼
proxy.ts            ← Login-Schutz (signiertes Session-Token), CSRF-Check, Fail-closed
   ▼
app/api/data/route.ts  ← PUT mit Whitelist-Schema-Validierung
   ▼
lib/store.ts        ← Upstash Redis (Prod) / lokale Datei (Dev)
```

Mehrstufige Verteidigung: Passwort-Gate, Schema-Whitelist beim Speichern
(keine negativen Beträge, garantierte Kategorienvariante, Trimming der Notizen),
Monatswerte werden erst im Browser zerlegt.
