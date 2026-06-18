// Gurktaler Kräuterführungen — Buchungsserver
// Synology DS124, Port 3007
// Tailscale-IP: 100.121.103.107
// Basispfad: /volume1/Gurktaler/fuehrungen

const http       = require('http');
const fs         = require('fs').promises;
const path       = require('path');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');

const BASE_PATH  = process.env.APP_BASE   || '/volume1/Gurktaler/fuehrungen';
const PORT       = parseInt(process.env.APP_PORT   || '3007', 10);
const ADMIN_PASS = process.env.ADMIN_PASS || 'gurktaler2026';
const NOTIFY_TO  = process.env.NOTIFY_TO  || 'diwk@aon.at';
const FROM_NAME  = 'Gurktaler Führungen';
const FROM_EMAIL = process.env.FROM_EMAIL || 'diwk@aon.at';

const DATA_PATH  = path.join(BASE_PATH, 'data');
const PUB_PATH   = path.join(__dirname, 'public');

const PREIS = 15;

// Termine Saison 2026 (fix konfiguriert)
const TERMINE = [
  { id: 't1', datum: '2026-07-19', label: '19.07.2026', tag: 'So', uhrzeit: '14:00', kapazitaet: 30 },
  { id: 't2', datum: '2026-08-15', label: '15.08.2026', tag: 'Sa', uhrzeit: '13:00', kapazitaet: 30 },
  { id: 't3', datum: '2026-09-13', label: '13.09.2026', tag: 'So', uhrzeit: '14:00', kapazitaet: 30 },
  { id: 't4', datum: '2026-10-18', label: '18.10.2026', tag: 'So', uhrzeit: '14:00', kapazitaet: 30 },
];

// ── SMTP ─────────────────────────────────────────────────────────────────────

function makeTransport() {
  if (!process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendMail(to, subject, html) {
  const t = makeTransport();
  if (!t) {
    console.log('[MAIL-MOCK] To:', to, '| Subj:', subject);
    return;
  }
  await t.sendMail({ from: `"${FROM_NAME}" <${FROM_EMAIL}>`, to, subject, html });
  console.log('[MAIL-SENT] To:', to);
}

// ── Daten ────────────────────────────────────────────────────────────────────

async function loadBuchungen() {
  try { return JSON.parse(await fs.readFile(path.join(DATA_PATH, 'buchungen.json'), 'utf8')); }
  catch { return []; }
}

async function saveBuchungen(data) {
  const existing = await loadBuchungen();
  if (existing.length > 0) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const bdir = path.join(BASE_PATH, 'backups');
    await fs.mkdir(bdir, { recursive: true });
    await fs.writeFile(path.join(bdir, `buchungen_${ts}.json`), JSON.stringify(existing));
  }
  await fs.writeFile(path.join(DATA_PATH, 'buchungen.json'), JSON.stringify(data, null, 2), 'utf8');
}

async function ensureDirs() {
  for (const d of ['data', 'logs', 'backups', 'public']) {
    await fs.mkdir(path.join(BASE_PATH, d), { recursive: true });
  }
  const bp = path.join(DATA_PATH, 'buchungen.json');
  try { await fs.access(bp); } catch { await fs.writeFile(bp, '[]'); }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((res, rej) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 32000) rej(new Error('Payload zu groß')); });
    req.on('end', () => res(body));
    req.on('error', rej);
  });
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function jsonOk(res, data)       { res.writeHead(200, { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); }
function jsonErr(res, status, m) { res.writeHead(status, { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ success: false, error: m })); }

function checkBasicAuth(req) {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Basic ')) return false;
  const [, pass] = Buffer.from(auth.slice(6), 'base64').toString().split(':');
  return pass === ADMIN_PASS;
}

// ── E-Mail-Templates ─────────────────────────────────────────────────────────

function tplBestaetigung(b, t) { return `
<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#1a1a1a;">
  <div style="background:#1b3d1b;padding:24px 32px;">
    <p style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:1px;">BUCHUNGSBESTÄTIGUNG</p>
    <p style="color:rgba(255,255,255,.65);margin:4px 0 0;font-size:12px;">Gurktaler Kräuterführungen · Stift Gurk · Kärnten</p>
  </div>
  <div style="padding:28px 32px;background:#f7f3ea;">
    <p>Liebe/r <strong>${b.vorname} ${b.nachname}</strong>,<br>vielen Dank für Ihre Buchung!</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#fff;border:1px solid #d5ccb8;font-size:13px;">
      <tr style="background:#1b3d1b;"><td colspan="2" style="padding:10px 14px;color:#fff;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Ihre Buchung</td></tr>
      <tr><td style="padding:9px 14px;color:#666;border-bottom:1px solid #ece4d0;width:38%;">Buchungsnr.</td><td style="padding:9px 14px;font-weight:700;border-bottom:1px solid #ece4d0;">${b.id}</td></tr>
      <tr><td style="padding:9px 14px;color:#666;border-bottom:1px solid #ece4d0;">Termin</td><td style="padding:9px 14px;font-weight:700;border-bottom:1px solid #ece4d0;">${t.label} (${t.tag}), ${t.uhrzeit} Uhr</td></tr>
      <tr><td style="padding:9px 14px;color:#666;border-bottom:1px solid #ece4d0;">Personen</td><td style="padding:9px 14px;border-bottom:1px solid #ece4d0;">${b.personen} × € ${PREIS},–</td></tr>
      <tr style="background:#f0dfa0;"><td style="padding:9px 14px;font-weight:700;">Gesamtbetrag</td><td style="padding:9px 14px;font-size:15px;font-weight:800;color:#1b3d1b;">€ ${b.gesamtpreis},–</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#fff;border:1px solid #d5ccb8;font-size:13px;">
      <tr style="background:#1b3d1b;"><td colspan="2" style="padding:10px 14px;color:#fff;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Treffpunkt & Wichtiges</td></tr>
      <tr><td style="padding:9px 14px;color:#666;border-bottom:1px solid #ece4d0;width:38%;">Treffpunkt</td><td style="padding:9px 14px;border-bottom:1px solid #ece4d0;"><strong>Domplatz 11, Stift Gurk</strong><br><span style="color:#666;">Einfahrt JUFA-Hotel · Schild „Hier geht's zur Gurktaler Führung"</span></td></tr>
      <tr><td style="padding:9px 14px;color:#666;border-bottom:1px solid #ece4d0;">Bezahlung</td><td style="padding:9px 14px;border-bottom:1px solid #ece4d0;">Vor Ort — Bar oder Karte</td></tr>
      <tr><td style="padding:9px 14px;color:#666;">Stornierung</td><td style="padding:9px 14px;">Kostenlos bis 3 Tage vorher per E-Mail an <a href="mailto:${NOTIFY_TO}" style="color:#1b3d1b;">${NOTIFY_TO}</a></td></tr>
    </table>
    <p style="font-size:12px;color:#555;line-height:1.6;"><strong>Schlechtwetter:</strong> Entscheidung durch Wolfgang Kulmitzer am Vorabend bis 18:00 Uhr — Sie werden per E-Mail informiert.</p>
    <p style="margin-top:20px;">Wir freuen uns auf Sie!<br><strong>Dipl.-Ing. Wolfgang Kulmitzer</strong></p>
  </div>
  <div style="background:#1b3d1b;padding:12px 32px;text-align:center;"><p style="color:rgba(255,255,255,.4);font-size:11px;margin:0;">Gurktaler Alpenkräuter · Stift Gurk · Kärnten</p></div>
</div>`; }

function tplNotify(b, t) { return `
<div style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:500px;">
  <h2 style="color:#1b3d1b;margin:0 0 16px;">Neue Führungsbuchung</h2>
  <table style="border-collapse:collapse;width:100%;font-size:13px;">
    <tr><td style="padding:7px 12px;background:#f7f3ea;color:#666;width:38%;">Buchungsnr.</td><td style="padding:7px 12px;font-weight:700;">${b.id}</td></tr>
    <tr><td style="padding:7px 12px;background:#f7f3ea;color:#666;">Termin</td><td style="padding:7px 12px;">${t.label} (${t.tag}), ${t.uhrzeit} Uhr</td></tr>
    <tr><td style="padding:7px 12px;background:#f7f3ea;color:#666;">Name</td><td style="padding:7px 12px;font-weight:700;">${b.vorname} ${b.nachname}</td></tr>
    <tr><td style="padding:7px 12px;background:#f7f3ea;color:#666;">E-Mail</td><td style="padding:7px 12px;">${b.email}</td></tr>
    <tr><td style="padding:7px 12px;background:#f7f3ea;color:#666;">Telefon</td><td style="padding:7px 12px;">${b.telefon || '–'}</td></tr>
    <tr style="background:#f0dfa0;"><td style="padding:7px 12px;font-weight:700;">Personen / Preis</td><td style="padding:7px 12px;font-size:15px;font-weight:800;color:#1b3d1b;">${b.personen} Pers. · € ${b.gesamtpreis},–</td></tr>
    <tr><td style="padding:7px 12px;background:#f7f3ea;color:#666;">Buchungszeit</td><td style="padding:7px 12px;">${new Date(b.createdAt).toLocaleString('de-AT')}</td></tr>
  </table>
</div>`; }

function tplAbsage(b, t, grund) { return `
<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#1a1a1a;">
  <div style="background:#1b3d1b;padding:24px 32px;">
    <p style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:1px;">TERMINABSAGE</p>
    <p style="color:rgba(255,255,255,.65);margin:4px 0 0;font-size:12px;">Gurktaler Kräuterführungen · Stift Gurk · Kärnten</p>
  </div>
  <div style="padding:28px 32px;background:#f7f3ea;">
    <p>Liebe/r <strong>${b.vorname} ${b.nachname}</strong>,</p>
    <p>leider müssen wir Ihnen mitteilen, dass die Führung am <strong>${t.label} (${t.tag}), ${t.uhrzeit} Uhr</strong> abgesagt werden muss.</p>
    <div style="background:#fff;border-left:4px solid #b8891a;padding:12px 16px;margin:20px 0;font-size:13px;"><strong>Grund:</strong> ${grund || 'Mindest-Teilnehmerzahl von 10 Personen nicht erreicht.'}</div>
    <p>Wir entschuldigen uns und würden uns freuen, Sie bei einem anderen Termin begrüßen zu dürfen.</p>
    <p>Bei Fragen: <a href="mailto:${NOTIFY_TO}" style="color:#1b3d1b;">${NOTIFY_TO}</a></p>
    <p style="margin-top:20px;">Mit freundlichen Grüßen,<br><strong>Dipl.-Ing. Wolfgang Kulmitzer</strong></p>
  </div>
  <div style="background:#1b3d1b;padding:12px 32px;text-align:center;"><p style="color:rgba(255,255,255,.4);font-size:11px;margin:0;">Gurktaler Alpenkräuter · Stift Gurk · Kärnten</p></div>
</div>`; }

// ── Router ────────────────────────────────────────────────────────────────────

async function router(req, res, url) {
  const m = req.method.toUpperCase();
  const p = url.pathname;

  if (m === 'OPTIONS') { res.writeHead(200, CORS); res.end(); return; }

  // ── Public endpoints ───────────────────────────────────────────────────────

  if (m === 'GET' && p === '/api/health') {
    return jsonOk(res, { success: true, app: 'Führungen-Server', port: PORT, uptime: Math.floor(process.uptime()), ts: new Date().toISOString() });
  }

  if (m === 'GET' && p === '/api/kapazitaet') {
    const buchungen = await loadBuchungen();
    const result = {};
    for (const t of TERMINE) {
      const gebucht = buchungen.filter(b => b.terminId === t.id && b.status === 'aktiv').reduce((s, b) => s + b.personen, 0);
      result[t.id] = Math.max(0, t.kapazitaet - gebucht);
    }
    return jsonOk(res, result);
  }

  if (m === 'POST' && p === '/api/buchen') {
    let body;
    try { body = JSON.parse(await readBody(req)); }
    catch { return jsonErr(res, 400, 'Ungültiges JSON'); }

    const { terminId, personen, vorname, nachname, email, telefon } = body;
    const termin = TERMINE.find(t => t.id === terminId);
    if (!termin)                          return jsonErr(res, 400, 'Ungültiger Termin');
    if (!personen || personen < 1 || personen > 30) return jsonErr(res, 400, 'Ungültige Personenzahl');
    if (!vorname?.trim() || !nachname?.trim())      return jsonErr(res, 400, 'Vor- und Nachname erforderlich');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonErr(res, 400, 'Ungültige E-Mail-Adresse');

    // Kapazität prüfen
    const buchungen = await loadBuchungen();
    const gebucht = buchungen.filter(b => b.terminId === terminId && b.status === 'aktiv').reduce((s, b) => s + b.personen, 0);
    if (gebucht + Number(personen) > termin.kapazitaet)
      return jsonErr(res, 409, `Kapazität erschöpft — noch ${termin.kapazitaet - gebucht} Plätze frei`);

    const buchung = {
      id:           'BK-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase(),
      createdAt:    new Date().toISOString(),
      terminId,
      terminLabel:  `${termin.label} (${termin.tag}), ${termin.uhrzeit} Uhr`,
      personen:     Number(personen),
      vorname:      vorname.trim(),
      nachname:     nachname.trim(),
      email:        email.trim().toLowerCase(),
      telefon:      telefon?.trim() || '',
      gesamtpreis:  Number(personen) * PREIS,
      status:       'aktiv',
    };
    buchungen.push(buchung);
    await saveBuchungen(buchungen);
    console.log('[BUCHUNG]', buchung.id, buchung.vorname, buchung.nachname, buchung.terminLabel);

    // E-Mails (non-blocking)
    sendMail(buchung.email, `Buchungsbestätigung – Gurktaler Führung ${termin.label}`, tplBestaetigung(buchung, termin)).catch(e => console.error('[MAIL-ERR]', e.message));
    sendMail(NOTIFY_TO,     `Neue Buchung: ${buchung.vorname} ${buchung.nachname}, ${buchung.personen} Pers., ${termin.label}`, tplNotify(buchung, termin)).catch(e => console.error('[MAIL-ERR]', e.message));

    return jsonOk(res, { success: true, buchungId: buchung.id, terminLabel: buchung.terminLabel, personen: buchung.personen, gesamtpreis: buchung.gesamtpreis });
  }

  // ── Admin-Bereich (Basic Auth) ─────────────────────────────────────────────

  if (p.startsWith('/admin') || p.startsWith('/api/admin')) {
    if (!checkBasicAuth(req)) {
      res.writeHead(401, { ...CORS, 'WWW-Authenticate': 'Basic realm="Führungen Admin"', 'Content-Type': 'text/plain' });
      res.end('Zugriff verweigert'); return;
    }
  }

  if (m === 'GET' && (p === '/admin' || p === '/admin/')) {
    try {
      const html = await fs.readFile(path.join(PUB_PATH, 'admin.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html);
    } catch { jsonErr(res, 500, 'admin.html nicht gefunden'); }
    return;
  }

  if (m === 'GET' && p === '/api/admin/buchungen') {
    const buchungen = await loadBuchungen();
    const summary = TERMINE.map(t => {
      const aktiv = buchungen.filter(b => b.terminId === t.id && b.status === 'aktiv');
      return {
        termin:        t,
        buchungen:     aktiv,
        gesamtPersonen: aktiv.reduce((s, b) => s + b.personen, 0),
        freiePlaetze:   t.kapazitaet - aktiv.reduce((s, b) => s + b.personen, 0),
      };
    });
    return jsonOk(res, { success: true, summary, totalAktiv: buchungen.filter(b => b.status === 'aktiv').length });
  }

  if (m === 'POST' && p === '/api/admin/absage') {
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return jsonErr(res, 400, 'Ungültiges JSON'); }
    const { terminId, grund } = body;
    const termin = TERMINE.find(t => t.id === terminId);
    if (!termin) return jsonErr(res, 400, 'Ungültiger Termin');

    const buchungen = await loadBuchungen();
    const betroffen = buchungen.filter(b => b.terminId === terminId && b.status === 'aktiv');
    buchungen.forEach(b => { if (b.terminId === terminId && b.status === 'aktiv') b.status = 'abgesagt'; });
    await saveBuchungen(buchungen);

    let gesendet = 0;
    for (const b of betroffen) {
      try {
        await sendMail(b.email, `Absage – Gurktaler Führung ${termin.label}`, tplAbsage(b, termin, grund));
        gesendet++;
      } catch (e) { console.error('[MAIL-ERR]', e.message); }
    }
    console.log('[ABSAGE]', terminId, '— E-Mails gesendet:', gesendet);
    return jsonOk(res, { success: true, terminId, emailsGesendet: gesendet, betroffenePersonen: betroffen.reduce((s, b) => s + b.personen, 0) });
  }

  return jsonErr(res, 404, 'Route nicht gefunden: ' + m + ' ' + p);
}

// ── Server ────────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost:' + PORT);
    console.log('[' + new Date().toISOString().slice(0,19) + '] ' + req.method + ' ' + url.pathname);
    await router(req, res, url);
  } catch (err) {
    console.error('[ERROR]', err.message);
    if (!res.headersSent) { res.writeHead(err.status || 500, CORS); res.end(JSON.stringify({ success: false, error: err.message })); }
  }
});

server.listen(PORT, () => {
  console.log('=================================================');
  console.log('  Gurktaler Führungen — Buchungsserver');
  console.log('  Port     : ' + PORT);
  console.log('  Basis    : ' + BASE_PATH);
  console.log('  SMTP     : ' + (process.env.SMTP_USER ? 'konfiguriert' : 'MOCK (keine E-Mails)'));
  console.log('  Health   : http://100.121.103.107:' + PORT + '/api/health');
  console.log('  Kapaz.   : http://100.121.103.107:' + PORT + '/api/kapazitaet');
  console.log('  Admin    : http://100.121.103.107:' + PORT + '/admin');
  console.log('=================================================');
});

server.on('error', err => { console.error('FATAL:', err.message); process.exit(1); });
ensureDirs().then(() => console.log('[INIT] Verzeichnisse bereit.')).catch(console.error);
