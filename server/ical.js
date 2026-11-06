/*
 * Kalendarz w telefonie: prywatny link w formacie iCal (.ics) do subskrypcji
 * w Kalendarzu Google, na iPhonie albo w Outlooku. Tylko do odczytu.
 * Ze względu na RODO w kalendarzu jest imię z inicjałem nazwiska i zabieg — bez telefonu i uwag.
 */
const { db } = require('./db');
const B = require('./booking');
const { randomToken } = require('./security');

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const utc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const at = (date, min) => new Date(date + 'T' + B.toTime(min) + ':00'); // czas gabinetu (TZ Europe/Warsaw)
// linie dłuższe niż 75 bajtów dzielimy zgodnie ze standardem
function fold(line) {
  const out = []; let cur = '';
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > 73) { out.push(cur); cur = ' ' + ch; } else cur += ch;
  }
  return out.concat(cur).join('\r\n');
}

function tokenFor(adminId, renew) {
  const row = db.prepare('SELECT ical_token FROM admins WHERE id = ?').get(adminId);
  if (row && row.ical_token && !renew) return row.ical_token;
  const t = randomToken(24);
  db.prepare('UPDATE admins SET ical_token = ? WHERE id = ?').run(t, adminId);
  return t;
}
const adminByToken = (t) => (t && t.length >= 24 ? db.prepare('SELECT id FROM admins WHERE ical_token = ?').get(t) : null);

function feed(baseUrl) {
  const from = new Date(); from.setDate(from.getDate() - 30);
  const to = new Date(); to.setDate(to.getDate() + 180);
  const stamp = utc(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Justyna Manka Beauty//Rezerwacje//PL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Gabinet — wizyty', 'X-WR-TIMEZONE:Europe/Warsaw', 'REFRESH-INTERVAL;VALUE=DURATION:PT15M', 'X-PUBLISHED-TTL:PT15M'];
  db.prepare("SELECT * FROM bookings WHERE status IN ('confirmed','done') AND date BETWEEN ? AND ? ORDER BY date, start_min").all(B.isoDate(from), B.isoDate(to)).forEach((b) => {
    const c = B.contactOf(b);
    const who = c ? (c.firstName + ' ' + (c.lastName ? c.lastName[0] + '.' : '')).trim() : 'klientka';
    lines.push('BEGIN:VEVENT', `UID:wizyta-${b.id}@justynamanka.pl`, `DTSTAMP:${stamp}`,
      `DTSTART:${utc(at(b.date, b.start_min))}`, `DTEND:${utc(at(b.date, b.end_min))}`,
      fold(`SUMMARY:${esc(b.treatment_name + ' · ' + who)}`),
      fold(`DESCRIPTION:${esc(`Źródło: ${b.source === 'online' ? 'strona' : b.source}. Telefon i szczegóły w panelu: ${baseUrl}/panel.html`)}`),
      'STATUS:CONFIRMED', 'TRANSP:OPAQUE', 'END:VEVENT');
  });
  db.prepare('SELECT * FROM blocks WHERE date BETWEEN ? AND ?').all(B.isoDate(from), B.isoDate(to)).forEach((x) => {
    lines.push('BEGIN:VEVENT', `UID:blokada-${x.id}@justynamanka.pl`, `DTSTAMP:${stamp}`,
      `DTSTART:${utc(at(x.date, x.start_min))}`, `DTEND:${utc(at(x.date, x.end_min))}`, fold(`SUMMARY:${esc('Blokada' + (x.note ? ': ' + x.note : ''))}`), 'TRANSP:OPAQUE', 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

module.exports = { tokenFor, adminByToken, feed };
