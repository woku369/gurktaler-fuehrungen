# Roadmap — Gurktaler Kräuterführungen Buchungsseite

**Letztes Update:** Juni 2026  
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
- [x] Hinweise-Box (Mindest-TN, Bezahlung, Storno, Treffpunkt-Platzhalter)
- [x] Kräutermeister-Box (Dipl.-Ing. Wolfgang Kulmitzer)
- [x] Goodie-Bag-Band
- [x] Dom-Divider-Sektion
- [x] Footer (Kontakt, Rechtliches, Social Icons)

### Buchungsformular (Frontend-Mockup)
- [x] Termin-Auswahl (Radio-Buttons mit Restkapazitäts-Anzeige)
- [x] Personen-Stepper (1–30, durch Restkapazität begrenzt)
- [x] Kontaktfelder (Vorname, Nachname, E-Mail, Telefon optional)
- [x] DSGVO- und AGB-Checkbox
- [x] Client-seitige Validierung (Pflichtfelder, E-Mail-Format, Checkboxen)
- [x] Success-Overlay mit Buchungszusammenfassung
- [x] Preis-Live-Anzeige (€ 15,– × Personenanzahl)

### Assets & Performance
- [x] Alle Bilder als Base64 eingebettet (self-contained, kein externer Asset-Server nötig)
- [x] Eskapade-Fraktur-Font durch Montserrat ersetzt (kein proprietärer Font mehr)
- [x] Duplizierte Base64-Bilder dedupliziert (Dom-Illustration 3×→1×, Logo 2×→1×)
- [x] Cormorant Garamond (ungenutzt) aus Google-Fonts-Link entfernt
- [x] **Dateigröße: 1,25 MB → 465 KB (−63%)**

### Deployment
- [x] GitHub Pages (live unter woku369.github.io/gurktaler-fuehrungen)

---

## Offen — Inhaltlich

> Lieferung durch Wolfgang Kulmitzer / Büro

- [ ] **Echte Terminliste** — Datum + Uhrzeit aller Führungen 2025/2026 (aktuell Platzhalter-Daten)
- [ ] **Treffpunkt** — konkreter Ort/Beschreibung (aktuell `[Platzhalter]` in der Sidebar)
- [ ] **Stimmungsbilder** — je ein Foto Kräutergarten + Mazerationsraum (für geplante Bildsektion)
- [ ] **E-Mail-Adresse** klären — `fuehrungen@gurktaler.at` / `info@gurktaler.at` / Marlies direkt
- [ ] **Angebotsstruktur** klären — öffentliche Einzelbuchung vs. B2B-Busgruppen (separates Angebot?)

---

## Offen — Technisch

### Priorität Hoch (MVP-Backend)
- [ ] **Echtes Backend** für Formular-Submission (aktuell nur Client-Mockup, keine Datenpersistenz)
- [ ] **Kapazitätsverwaltung** — Buchungen in JSON/DB statt hartcodiertem `kap`-Objekt
- [ ] **Buchungsbestätigung per E-Mail** — automatisch nach erfolgreicher Buchung (Template liegt vor)
- [ ] **Schreiblock** gegen Race Conditions bei gleichzeitigen Buchungen

### Priorität Mittel
- [ ] **Admin-Ansicht** für Marlies Maunz — Buchungsübersicht, TN-Zahlen je Termin, Export
- [ ] **E-Mail-Automatisierung vollständig** — alle 4 Templates:
  1. Buchungsbestätigung (sofort)
  2. Absage wegen Mindest-TN (3 Tage vorher)
  3. Schlechtwetter-Information (Vorabend)
  4. Unwetter-Absage (Vorabend)
- [ ] **SMTP-Relay** einrichten (z. B. Brevo Free) — direkter NAS-Mailversand landet im Spam
- [ ] **DSGVO-konforme Datenspeicherung** (Löschfristen, Datenschutzerklärung verlinken)
- [ ] **HTTP Basic Auth** für Admin-Ansicht (Buchungsdaten sind DSGVO-relevant)

### Priorität Niedrig
- [ ] **Mobile-Test** auf echtem Gerät (Breakpoints vorhanden, aber nicht auf Smartphone verifiziert)
- [ ] **DNS-Subdomain** `fuehrungen.gurktaler.at` via CNAME auf GitHub Pages / NAS (Global Village)
- [ ] **Bildgalerie** Kräutergarten + Mazerationsraum (sobald Fotos von Wolfgang vorliegen)
- [ ] **Assets auslagern** — Base64 → separate Dateien mit Cache-Header (sinnvoll erst wenn Backend läuft)
- [ ] **WordPress-Integration** klären — GitHub Pages dauerhaft oder Einbettung in gurktaler.at (Agentur bevelop)?

---

## Architektur-Notizen

### Aktueller Stand
- Eine einzige `index.html`, self-contained (alle Assets eingebettet)
- Reine Client-Logik, kein Server
- Hosting: GitHub Pages

### Geplante Backend-Architektur (Empfehlung)
- Node.js HTTP-Server auf NAS, served via Tailscale Funnel (analog LagerMeister-Architektur)
- JSON-Dateien als Datenquelle (`buchungen.json`, `termine.json`)
- SMTP-Relay für E-Mail-Versand (Brevo o.ä.)
- Admin-HTML als zweite Seite auf demselben Server

### Geschäftslogik-Referenz
| Regel | Detail |
|---|---|
| Kapazität | Max. 30 Personen/Termin |
| Mindest-TN | 10 Personen — Absage 3 Tage vorher |
| Buchungsschluss | 3 Tage vor Termin |
| Storno | Kostenlos bis 3 Tage vorher per E-Mail |
| Bezahlung | Ausschließlich vor Ort (Bar/Karte) |
| Preis | € 15,– pro Person |
| Schlechtwetter | Wolfgang entscheidet Vorabend 18:00 Uhr |
| Samstagstermine | Marlies nicht verfügbar → Wolfgang versendet direkt |
