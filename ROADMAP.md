# Roadmap — Gurktaler Kräuterführungen Buchungsseite

**Letztes Update:** 2026-06-20
**Live:** https://woku369.github.io/gurktaler-fuehrungen/
**Repo:** https://github.com/woku369/gurktaler-fuehrungen

---

## Erledigt

### Frontend-Grundstruktur
- [x] Statisches HTML-Frontend (self-contained, kein Build-Step)
- [x] Design-System: Farben, Corporate Identity (Grün/Gold-Palette, CSS Custom Properties)
- [x] Schriften: Montserrat (Body + Headings), Google Fonts
- [x] Responsive Layout (CSS-Breakpoints, Mobile-Ansicht)
- [x] Sticky Navigation mit Gurktaler-Wortmark-Logo
- [x] Hero-Sektion (Eskapade Fraktur → Montserrat 800)
- [x] Info-Bar (Dauer, Kapazität, Preis, Mindest-TN)
- [x] Kräuterband (schwarzes Band mit Botanik-Illustration)
- [x] 2-Spalten-Layout: Inhaltsbereich + Sidebar
- [x] Programmablauf-Box (3 Schritte)
- [x] Schlechtwetter-Box (3 Szenarien)
- [x] Hinweise-Box (Mindest-TN, Bezahlung, Storno, Treffpunkt)
- [x] Kräutermeister-Box (Dipl.-Ing. Wolfgang Kulmitzer)
- [x] Goodie-Bag-Band
- [x] Dom-Divider-Sektion
- [x] Footer (Kontakt, Rechtliches, Social Icons)

### Buchungsformular
- [x] Termin-Auswahl (Radio-Buttons mit Restkapazitäts-Anzeige)
- [x] Personen-Stepper (1–30, durch Restkapazität begrenzt)
- [x] Kontaktfelder (Vorname, Nachname, E-Mail, Telefon optional)
- [x] DSGVO- und AGB-Checkbox
- [x] Client-seitige Validierung (Pflichtfelder, E-Mail-Format, Checkboxen)
- [x] Success-Overlay mit Buchungszusammenfassung
- [x] Preis-Live-Anzeige (€ 15,– × Personenanzahl)
- [x] Live-Kapazitätsprüfung gegen NAS-Server (`/api/fuehrungen/kapazitaet`)
- [x] Offline-Fallback (Buchung weiterhin möglich, Hinweis ohne Echtzeitdaten)

### Assets & Performance
- [x] Alle Bilder als Base64 eingebettet (self-contained, kein externer Asset-Server nötig)
- [x] Eskapade-Fraktur-Font durch Montserrat ersetzt (kein proprietärer Font mehr)
- [x] Duplizierte Base64-Bilder dedupliziert (Dom-Illustration 3×→1×, Logo 2×→1×)
- [x] Cormorant Garamond (ungenutzt) aus Google-Fonts-Link entfernt
- [x] **Dateigröße: 1,25 MB → 465 KB (−63%)**

### Backend & Infrastruktur (Juni 2026)
- [x] **Echtes Backend** via TerminMeister-Server (Port 3005) auf Synology DS124
- [x] API-Routen auf TerminMeister integriert: `/api/fuehrungen/kapazitaet`, `/api/fuehrungen/buchen`
- [x] **Kapazitätsverwaltung** — Buchungen in `appointments.json` statt hartcodiertem Objekt
- [x] **Schreiblock** gegen Race Conditions via `safeWriteJson`
- [x] **E-Mail-Versand via Brevo SMTP** (300/Tag kostenlos, nodemailer):
  - [x] Buchungsbestätigung an Gast (Termin, Personenzahl, Buchungsnr., Treffpunkt, Preis)
  - [x] Admin-Benachrichtigung an `diwk@aon.at` bei jeder Buchung
  - [x] Absage-E-Mail an alle gebuchten Gäste eines Termins
- [x] **Tailscale Funnel** — NAS öffentlich erreichbar: `https://ds124-rockingk.tail334b55.ts.net`
- [x] `SERVER_URL` in `index.html` auf Funnel-URL gesetzt

### Admin-Dashboard für Marlies (Juni 2026)
- [x] URL: `http://100.121.103.107:3005/fuehrungen-admin` / `https://ds124-rockingk.tail334b55.ts.net/fuehrungen-admin`
- [x] HTTP Basic Auth (`ADMIN_PASS` Umgebungsvariable)
- [x] Buchungsübersicht: 4 Termine, Kapazitätsbalken, Tabelle mit Kontaktdaten
- [x] Quelle-Spalte: Online (Web-Buchung) vs. Direkt (manuell)
- [x] **„+ Termin manuell erfassen"** — telefonische/direkte Anmeldungen eintragen
- [x] Termin absagen mit E-Mail an alle Gäste
- [x] Auto-Refresh alle 30 Sekunden
- [x] Vollständige Betriebsanleitung: `ANLEITUNG.md`

### TerminMeister-Integration (Juni 2026)
- [x] Web-Buchungen werden im vollständigen TerminMeister-Format gespeichert
  (`title`, `start`, `end`, `type`, `status`, `location`, `gruppengröße`, Kontaktfelder)
- [x] Erscheinen direkt im TerminMeister-Kalender am jeweiligen Führungstag
- [x] Manuelle Buchungen (Marlies) ebenfalls TerminMeister-kompatibel (`buchungsquelle: 'intern'`)
- [x] Kapazität zählt online und manuelle Buchungen gemeinsam

### Deployment
- [x] GitHub Pages (live unter woku369.github.io/gurktaler-fuehrungen)
- [x] QR-Code (686×686px, 300dpi, Gurktaler-Grün, G-Logo-Zentrum) als Download in TerminMeister Handbuch

---

## Offen

### Kurzfristig
- [ ] **E-Mail-Test bestätigen** — `[MAIL] Gesendet` im NAS-Log nach echter Buchung prüfen
- [ ] **DSM Task Scheduler** — Startbefehl mit SMTP-Variablen eintragen (für Autostart nach Neustart)
- [ ] **DSGVO-konforme Datenspeicherung** — Löschfristen dokumentieren, Datenschutzerklärung verlinken

### Mittelfristig
- [ ] **DNS-Subdomain** `fuehrungen.gurktaler.at` via CNAME auf GitHub Pages (Global Village / bevelop)
- [ ] **Bildgalerie** — Kräutergarten + Mazerationsraum (wenn Fotos von Wolfgang vorliegen)
- [ ] **Schlechtwetter-E-Mail** — Template und Versand-Trigger (Wolfgang entscheidet Vorabend 18:00)
- [ ] **Buchungsschluss** — automatisch 3 Tage vor Termin (Frontend + Backend)
- [ ] **Mobile-Test** auf echtem Gerät validieren

### Saison 2027 (Oktober 2026)
- [ ] Neue Termine in `FUEHRUNGEN_TERMINE` in `server.js` eintragen
- [ ] Terminliste in `index.html` aktualisieren (4 Radio-Buttons)
- [ ] Auf NAS deployen + GitHub Pages pushen

---

## Architektur-Notizen

### Aktueller Stand
```
Buchungsseite (GitHub Pages)
  https://woku369.github.io/gurktaler-fuehrungen/
          │
          │  POST /api/fuehrungen/buchen
          │  GET  /api/fuehrungen/kapazitaet
          ▼
TerminMeister-Server (Synology DS124, Port 3005)
  https://ds124-rockingk.tail334b55.ts.net   ← Tailscale Funnel
  http://100.121.103.107:3005                ← intern (Tailscale)
          │
          ├── appointments.json  ← Web + manuelle Buchungen (TerminMeister-Format)
          ├── E-Mail via Brevo SMTP (smtp-relay.brevo.com:587)
          └── /fuehrungen-admin  ← Admin-Dashboard (Marlies)
```

### Geschäftslogik-Referenz
| Regel | Detail |
|---|---|
| Kapazität | Max. 30 Personen/Termin |
| Mindest-TN | 10 Personen — Absage 3 Tage vorher |
| Buchungsschluss | 3 Tage vor Termin (noch nicht automatisiert) |
| Storno | Kostenlos bis 3 Tage vorher per E-Mail |
| Bezahlung | Ausschließlich vor Ort (Bar/Karte) |
| Preis | € 15,– pro Person |
| Schlechtwetter | Wolfgang entscheidet Vorabend 18:00 Uhr |
| Samstagstermine | Marlies nicht verfügbar → Wolfgang versendet direkt |

### Termine Saison 2026
| ID | Datum | Tag | Uhrzeit | Kapazität |
|---|---|---|---|---|
| t1 | 19.07.2026 | So | 14:00 Uhr | 30 Personen |
| t2 | 15.08.2026 | Sa | 13:00 Uhr | 30 Personen |
| t3 | 13.09.2026 | So | 14:00 Uhr | 30 Personen |
| t4 | 18.10.2026 | So | 14:00 Uhr | 30 Personen |
