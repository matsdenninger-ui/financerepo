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

- Login-Schutz über `APP_PASSWORD` (Hash-Vergleich im Proxy-Middleware-Layer, httpOnly-Cookie).
- Daten liegen in **einem einzelnen JSON-Dokument** (`finanz:daten` in Upstash Redis).
- Lokaler Dev-Modus ohne Upstash speichert in `.data/finanz.json` (nicht committet, `.gitignore`).
- Auf Vercel MUSS Upstash konfiguriert sein (Vercel-Serverless hat kein dauerhaftes Dateisystem).

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
     - `APP_PASSWORD` = dein Dashboard-Passwort
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
proxy.ts            ← Login-Schutz (SHA-256-Token-Abgleich)
   ▼
app/api/data/route.ts  ← PUT mit Whitelist-Schema-Validierung
   ▼
lib/store.ts        ← Upstash Redis (Prod) / lokale Datei (Dev)
```

Mehrstufige Verteidigung: Passwort-Gate, Schema-Whitelist beim Speichern
(keine negativen Beträge, garantierte Kategorienvariante, Trimming der Notizen),
Monatswerte werden erst im Browser zerlegt.
