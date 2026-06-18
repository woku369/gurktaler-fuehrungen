# Führungen-Server — NAS Deployment

## Infrastruktur

| Variable | Wert |
|---|---|
| NAS | Synology DS124 |
| Tailscale-IP | 100.121.103.107 |
| SSH-User | Wolfgang |
| SMB-Share | `\\DS124-RockingK\Gurktaler\fuehrungen\` |
| Port | **3007** |
| Admin-URL | http://100.121.103.107:3007/admin |
| Health-Check | http://100.121.103.107:3007/api/health |

---

## Verzeichnisstruktur auf der NAS

```
/volume1/Gurktaler/fuehrungen/
├── server.js               ← GitHub: server/server.js
├── package.json            ← GitHub: server/package.json
├── node_modules/           ← nach npm install
├── public/
│   └── admin.html          ← GitHub: server/public/admin.html
├── data/
│   └── buchungen.json      ← automatisch angelegt
├── backups/                ← automatische Backups vor jedem Schreiben
└── logs/
    └── server.log
```

---

## Erstinstallation (einmalig)

### 1. Dateien auf NAS kopieren (Windows)

```powershell
# SMB-Share öffnen und Ordner anlegen
New-Item "\\DS124-RockingK\Gurktaler\fuehrungen\public" -ItemType Directory -Force

# Dateien kopieren
Copy-Item "server\server.js"       "\\DS124-RockingK\Gurktaler\fuehrungen\server.js"  -Force
Copy-Item "server\package.json"    "\\DS124-RockingK\Gurktaler\fuehrungen\package.json" -Force
Copy-Item "server\public\admin.html" "\\DS124-RockingK\Gurktaler\fuehrungen\public\admin.html" -Force
```

### 2. npm install (SSH)

```bash
ssh Wolfgang@100.121.103.107
cd /volume1/Gurktaler/fuehrungen
npm install
```

### 3. Umgebungsvariablen konfigurieren

Datei `/volume1/Gurktaler/fuehrungen/.env` anlegen:

```env
APP_PORT=3007
APP_BASE=/volume1/Gurktaler/fuehrungen
ADMIN_PASS=SICHERES_PASSWORT_HIER
NOTIFY_TO=diwk@aon.at
FROM_EMAIL=fuehrungen@gurktaler.at

# Brevo SMTP (https://app.brevo.com → SMTP & API → SMTP)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=diwk@aon.at
SMTP_PASS=BREVO_SMTP_KEY_HIER
```

### 4. Server starten

```bash
cd /volume1/Gurktaler/fuehrungen
node -e "require('dotenv').config(); require('./server.js')"
# oder mit nohup:
nohup node server.js >> logs/server.log 2>&1 &
```

**Hinweis:** Für `.env`-Support entweder `dotenv` installieren oder Variablen beim Start setzen:
```bash
APP_PORT=3007 ADMIN_PASS=xxx SMTP_USER=xxx SMTP_PASS=xxx nohup node server.js >> logs/server.log 2>&1 &
```

---

## Autostart (Synology Task Scheduler)

- **Trigger:** Bootup
- **User:** root
- **Befehl:**
```bash
sleep 30 && cd /volume1/Gurktaler/fuehrungen && APP_PORT=3007 ADMIN_PASS=IHR_PASSWORT NOTIFY_TO=diwk@aon.at SMTP_USER=diwk@aon.at SMTP_PASS=IHR_KEY nohup node server.js >> /volume1/Gurktaler/fuehrungen/logs/server.log 2>&1
```

---

## Tailscale Funnel einrichten (öffentlich erreichbar)

Damit das Buchungsformular auf GitHub Pages den NAS-Server erreichen kann:

```bash
# SSH auf NAS
tailscale funnel --bg 3007
# → Gibt eine öffentliche HTTPS-URL zurück, z.B.:
# https://ds124-rockinkg.tailXXXXX.ts.net
```

Diese URL in `index.html` eintragen (Zeile `const SERVER_URL = ''`):
```javascript
const SERVER_URL = 'https://ds124-rockinkg.tailXXXXX.ts.net';
```

---

## API-Endpunkte

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| GET | `/api/health` | – | Status-Check |
| GET | `/api/kapazitaet` | – | Freie Plätze je Termin |
| POST | `/api/buchen` | – | Buchung aufgeben |
| GET | `/admin` | Basic Auth | Admin-Dashboard |
| GET | `/api/admin/buchungen` | Basic Auth | Buchungsübersicht (JSON) |
| POST | `/api/admin/absage` | Basic Auth | Termin absagen + E-Mails |

---

## Updates deployen

```powershell
# server.js aktualisiert:
Copy-Item "server\server.js" "\\DS124-RockingK\Gurktaler\fuehrungen\server.js" -Force

# admin.html aktualisiert:
Copy-Item "server\public\admin.html" "\\DS124-RockingK\Gurktaler\fuehrungen\public\admin.html" -Force
```

Danach Node-Prozess neustarten:
```bash
ssh Wolfgang@100.121.103.107
ps aux | grep "node server" | grep -v grep
sudo kill <PID>
cd /volume1/Gurktaler/fuehrungen
APP_PORT=3007 ADMIN_PASS=xxx ... nohup node server.js >> logs/server.log 2>&1 &
```

---

## Brevo-Account einrichten (kostenlos, 300 E-Mails/Tag)

1. https://app.brevo.com → Registrieren mit `diwk@aon.at`
2. Menü: **SMTP & API** → **SMTP**
3. SMTP-Key generieren → in `.env` als `SMTP_PASS` eintragen
4. Absender-Domain verifizieren (optional, verbessert Zustellbarkeit)
