# LehrlingsApp – Hauser Kältetechnik

## Erste Schritte

```bash
cd lehrlingsapp
npm install
cp .env.example .env   # Supabase-Zugangsdaten eintragen (optional, App läuft auch offline)
npm run dev
```

Build für Produktion:
```bash
npm run build
```

## Login
- **Lehrling:** Personalnummer (muss zuvor im Admin-Panel unter "Lehrlinge" angelegt werden)
- **Admin:** Passwort `hauser2024` (siehe `src/app/components/LoginScreen.tsx`, für Produktivbetrieb ändern/durch Supabase Auth ersetzen)

## Supabase-Setup (optional, App läuft ohne vollständig offline)
1. Projekt auf supabase.com anlegen
2. Tabellen `lehrlinge` und `plan_data` gemäß Spezifikation anlegen
3. Storage-Buckets `lernapp-videos` (PUBLIC, max 50MB) und `werkzeug-fotos` (PUBLIC, max 10MB) anlegen
4. `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` in `.env` eintragen

## Chatbot
Der Claude-API-Key wird von einem Admin im Admin-Panel → Chatbot → Zahnrad-Icon eingetragen.
Ohne Key funktioniert der Chatbot nicht, der Rest der App ist davon unabhängig.

## Bekannte Punkte für den produktiven Einsatz
- Admin-Passwort ist aktuell hartkodiert – für Produktivbetrieb durch echte Auth ersetzen
- Die Claude-API wird direkt aus dem Browser aufgerufen (Key liegt im Client) – für Produktivbetrieb
  über eine Supabase Edge Function proxyen, damit der Key nie im Frontend landet
- `xlsx`-Paket hat eine bekannte Sicherheitslücke (ReDoS/Prototype Pollution) – für rein internen
  Admin-Upload vertretbar, bei Bedarf gegen `exceljs` austauschen
- PWA-Icons (`public/icon-192.png`, `icon-512.png`) sind aktuell nur einfarbige Platzhalter –
  vor Go-Live durch echtes Hauser-Logo ersetzen
