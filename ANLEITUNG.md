# Gurktaler Kräuterführungen — Betriebsanleitung

**System:** Online-Buchung für Kräuterführungen am Stift Gurk  
**Stand:** Saison 2026

---

## Übersicht: Wie hängt alles zusammen?

```
Gast öffnet Buchungsseite
        │
        ▼
GitHub Pages (öffentlich im Internet)
https://woku369.github.io/gurktaler-fuehrungen/
        │
        │  POST Buchung / GET freie Plätze
        ▼
TerminMeister-Server auf der NAS (Synology DS124)
http://100.121.103.107:3005   ← nur via Tailscale erreichbar
        │
        ├── speichert Buchung in appointments.json
        ├── sendet Bestätigungs-E-Mail an Gast
        └── sendet Benachrichtigung an diwk@aon.at

Marlies öffnet Admin-Dashboard im Browser
http://100.121.103.107:3005/fuehrungen-admin
        │
        ├── sieht alle Buchungen pro Termin
        └── kann Termin absagen → E-Mail an alle Gäste
```

---

## Alle Adressen im Überblick

### Öffentlich (Internet)

| Adresse | Beschreibung |
|---|---|
| `https://woku369.github.io/gurktaler-fuehrungen/` | **Buchungsformular** — diese URL an Gäste weitergeben |

### NAS intern (nur via Tailscale, kein öffentlicher Zugang)

| Adresse | Beschreibung | Zugang |
|---|---|---|
| `http://100.121.103.107:3005/fuehrungen-admin` | **Admin-Dashboard** für Marlies | Passwort (Basic Auth) |
| `http://100.121.103.107:3005/api/health` | Statuscheck — ist der Server online? | offen |
| `http://100.121.103.107:3005/api/fuehrungen/kapazitaet` | Freie Plätze je Termin (JSON) | offen |
| `http://100.121.103.107:3005/api/fuehrungen/buchen` | Buchung aufgeben (POST) | offen |
| `http://100.121.103.107:3005/api/fuehrungen/admin/buchungen` | Buchungsübersicht als JSON | Passwort |
| `http://100.121.103.107:3005/api/fuehrungen/admin/absage` | Termin absagen (POST) | Passwort |

> **Wichtig:** Die NAS-Adressen (`100.121.103.107`) sind nur erreichbar, wenn Tailscale aktiv ist (auf dem eigenen Gerät oder als Funnel eingerichtet). Solange kein Tailscale Funnel läuft, kann die **Buchungsseite keine Verbindung zum Server herstellen** — das Formular arbeitet dann offline (keine Kapazitätsprüfung, keine E-Mails).

### Nach Einrichtung des Tailscale Funnels (öffentlich erreichbar)

| Adresse | Beschreibung |
|---|---|
| `https://ds124-rockinkg.XXXXX.ts.net/fuehrungen-admin` | Admin-Dashboard von überall |
| `https://ds124-rockinkg.XXXXX.ts.net` | Basis-URL für die Buchungsseite |

> Die genaue Funnel-URL ergibt sich bei der Einrichtung (→ Abschnitt „Tailscale Funnel").

---

## Erstinstallation

### Schritt 1: Dateien auf der NAS liegen lassen

Der TerminMeister-Server (`server.js`) läuft bereits auf der NAS unter:
```
/volume1/Gurktaler/terminmeister/server.js
```
Die Führungs-Erweiterung ist in dieser Datei integriert — **kein separater Server** notwendig.

### Schritt 2: nodemailer installieren (einmalig per SSH)

```bash
ssh Wolfgang@100.121.103.107
cd /volume1/Gurktaler/terminmeister
npm install nodemailer
```

Falls noch kein `package.json` vorhanden ist:
```bash
npm init -y
npm install nodemailer
```

### Schritt 3: Startbefehl konfigurieren (Synology Task Scheduler)

Im DSM → Systemsteuerung → Aufgabenplaner → Erstellen → Ausgelöste Aufgabe → Benutzerdefiniertes Skript

- **Ereignis:** Bootup
- **Benutzer:** root
- **Befehl:**

```bash
sleep 30 && cd /volume1/Gurktaler/terminmeister && \
  APP_PORT=3005 \
  ADMIN_PASS=IHR_ADMIN_PASSWORT \
  NOTIFY_TO=diwk@aon.at \
  FROM_EMAIL=diwk@aon.at \
  SMTP_HOST=smtp-relay.brevo.com \
  SMTP_PORT=587 \
  SMTP_USER=diwk@aon.at \
  SMTP_PASS=IHR_BREVO_SMTP_KEY \
  nohup node server.js >> /volume1/Gurktaler/terminmeister/logs/server.log 2>&1
```

> Platzhalter ersetzen: `IHR_ADMIN_PASSWORT` und `IHR_BREVO_SMTP_KEY`

---

## Brevo SMTP einrichten (E-Mail-Versand)

Brevo ist ein kostenloser E-Mail-Dienst (300 E-Mails/Tag kostenlos).

1. **Registrieren:** https://app.brevo.com — mit `diwk@aon.at`
2. Im Menü: **SMTP & API** → **SMTP**
3. **SMTP-Key generieren** → diesen Key als `SMTP_PASS` im Startbefehl verwenden
4. SMTP-Zugangsdaten:
   - Host: `smtp-relay.brevo.com`
   - Port: `587`
   - User: `diwk@aon.at`
   - Passwort: der generierte SMTP-Key

**Test:** Nach dem ersten Start den Health-Check aufrufen:
```
http://100.121.103.107:3005/api/health
```
Antwort sollte `"status":"online"` zeigen.

---

## Tailscale Funnel einrichten

Damit das Buchungsformular (GitHub Pages) den NAS-Server über das Internet erreichen kann, muss ein **Tailscale Funnel** eingerichtet werden.

```bash
ssh Wolfgang@100.121.103.107
tailscale funnel --bg 3005
```

Die Ausgabe zeigt eine öffentliche URL, z.B.:
```
https://ds124-rockinkg.tail1a2b3c.ts.net
```

Diese URL in der Buchungsseite eintragen (→ nächster Abschnitt).

---

## SERVER_URL in der Buchungsseite eintragen

Nach der Tailscale-Einrichtung muss die Funnel-URL in `index.html` eingetragen werden.

In der Datei `/home/user/gurktaler-fuehrungen/index.html`, Zeile ~412:
```javascript
const SERVER_URL = '';   // ← hier die Funnel-URL eintragen
```
→ ändern auf:
```javascript
const SERVER_URL = 'https://ds124-rockinkg.tail1a2b3c.ts.net';
```

Danach per Git auf GitHub Pages veröffentlichen (benötigt GitHub PAT):
```bash
git remote set-url origin "https://woku369:IHR_TOKEN@github.com/woku369/gurktaler-fuehrungen.git"
git push origin main
git remote set-url origin "https://github.com/woku369/gurktaler-fuehrungen.git"
```

> **Sicherheitshinweis:** Das Token nach jedem Push sofort auf GitHub widerrufen:  
> github.com → Settings → Developer settings → Personal access tokens

---

## Täglicher Betrieb — Marlies

### Admin-Dashboard öffnen

1. Browser öffnen (Chrome, Firefox, Edge — alles funktioniert)
2. Adresse eingeben: `http://100.121.103.107:3005/fuehrungen-admin`  
   *(oder nach Funnel-Einrichtung: `https://ds124-rockinkg.XXXXX.ts.net/fuehrungen-admin`)*
3. Browser fragt nach Passwort → das vereinbarte `ADMIN_PASS` eingeben
   - **Benutzername:** beliebig (z.B. „marlies" oder leer lassen)
   - **Passwort:** das Admin-Passwort

### Was das Dashboard zeigt

- **Oben:** 4 Kennzahlen — Buchungen gesamt, Personen, erwarteter Umsatz, freie Plätze
- **Pro Termin:** Kapazitätsbalken + Tabelle mit allen Buchungen
  - Name, E-Mail, Telefon, Personenzahl, Preis, Buchungsdatum
  - Farbcodierung: grün = Plätze frei · gold = fast voll · rot = ausgebucht
- **Aktualisierung:** automatisch alle 30 Sekunden

### Termin absagen

1. Beim gewünschten Termin auf **„Absagen"** klicken
2. Grund eingeben (optional — Standard: „Mindest-Teilnehmerzahl nicht erreicht.")
3. Auf **„Absagen & E-Mails senden"** klicken
4. Alle angemeldeten Gäste erhalten automatisch eine Absage-E-Mail

---

## Termine (Saison 2026)

| ID | Datum | Tag | Uhrzeit | Kapazität |
|---|---|---|---|---|
| t1 | 19.07.2026 | So | 14:00 Uhr | 30 Personen |
| t2 | 15.08.2026 | Sa | 13:00 Uhr | 30 Personen |
| t3 | 13.09.2026 | So | 14:00 Uhr | 30 Personen |
| t4 | 18.10.2026 | So | 14:00 Uhr | 30 Personen |

**Preis:** € 15,– pro Person, Barzahlung vor Ort  
**Treffpunkt:** Domplatz 11, Stift Gurk — Einfahrt JUFA-Hotel

---

## E-Mails die das System versendet

| Auslöser | Empfänger | Inhalt |
|---|---|---|
| Neue Buchung | Gast | Buchungsbestätigung mit Termin, Personenzahl, Buchungsnummer, Treffpunkt |
| Neue Buchung | `diwk@aon.at` | Benachrichtigung mit allen Kontaktdaten des Gastes |
| Termin absagen | Alle gebuchten Gäste | Absage mit Grund, Hinweis keine Kosten |

---

## Datenspeicherung

Alle Buchungen werden auf der NAS gespeichert:
```
/volume1/Gurktaler/terminmeister/database/appointments.json
```

Web-Buchungen sind am Feld `"buchungsquelle": "web"` erkennbar und erscheinen auch in der TerminMeister-App (sofern synchronisiert).

Automatische Backups vor jedem Schreibvorgang:
```
/volume1/Gurktaler/terminmeister/backups/
```

---

## Fehlersuche

### Server antwortet nicht
```bash
# Statuscheck im Browser oder per curl:
http://100.121.103.107:3005/api/health

# Logs prüfen:
ssh Wolfgang@100.121.103.107
tail -50 /volume1/Gurktaler/terminmeister/logs/server.log
```

### E-Mails kommen nicht an
- Im Log nach `[MAIL-MOCK]` suchen → bedeutet: SMTP nicht konfiguriert
- Prüfen ob `SMTP_USER` und `SMTP_PASS` im Startbefehl gesetzt sind
- Brevo-Account prüfen: https://app.brevo.com → SMTP-Statistik

### Buchungsformular zeigt keine freien Plätze
- `SERVER_URL` in `index.html` ist leer oder falsch → Tailscale Funnel prüfen
- Formular funktioniert offline weiter, aber ohne Kapazitätsprüfung und ohne E-Mails

### Admin-Dashboard: „Zugriff verweigert"
- Passwort erneut eingeben (Browser-Cache leeren oder privaten Tab verwenden)
- Prüfen ob `ADMIN_PASS` im Startbefehl der NAS gesetzt ist

### Server neu starten (nach Update)
```bash
ssh Wolfgang@100.121.103.107
ps aux | grep "node server" | grep -v grep
# → PID notieren
sudo kill <PID>
cd /volume1/Gurktaler/terminmeister
APP_PORT=3005 ADMIN_PASS=xxx SMTP_USER=xxx SMTP_PASS=xxx \
  NOTIFY_TO=diwk@aon.at nohup node server.js >> logs/server.log 2>&1 &
```
