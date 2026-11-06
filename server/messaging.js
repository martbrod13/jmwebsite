/*
 * SMS-y i e-maile.
 * Tryb testowy (domyślny): wiadomości zapisują się w skrzynce testowej (panel → SMS i e-maile)
 * i wyświetlają w terminalu. Nic nie wychodzi na zewnątrz.
 * Tryb produkcyjny: SMS przez SMSAPI.pl, e-mail przez Resend — wystarczy uzupełnić .env.
 */
const { db, nowIso } = require('./db');
const env = require('./env');
const C = require('./site-config');

let baseUrl = env.publicUrl || 'http://localhost:' + env.port;
const setBaseUrl = (u) => { if (!env.publicUrl) baseUrl = u; };
const link = (path) => baseUrl + path;
const visitLink = (b) => link('/w/' + b.token);

const S = C.salon;
const sender = () => env.smsSender || S.smsSender;
const L = (lang, pl, en) => (lang === 'en' ? en : pl);
const dm = (dateStr) => dateStr.slice(8, 10) + '.' + dateStr.slice(5, 7);
const money = (v, lang) => v.toLocaleString(lang === 'en' ? 'en-GB' : 'pl-PL', { maximumFractionDigits: 2 }) + (lang === 'en' ? ' PLN' : ' zł');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Treści ---------- */
const sms = {
  confirmation: (b, name, lang) => L(lang,
    `${sender()}: Potwierdzamy wizytę ${dm(b.date)} o ${b.time} (${name}), ${S.street}. Zmiana lub odwołanie: ${visitLink(b)}`,
    `${sender()}: Your visit on ${dm(b.date)} at ${b.time} (${name}) is confirmed, ${S.street}. To change or cancel: ${visitLink(b)}`),
  reminder: (b, name, lang) => L(lang,
    `${sender()}: Przypominamy o wizycie jutro o ${b.time} (${name}), ${S.street}. Odwołanie: ${visitLink(b)}`,
    `${sender()}: A reminder about your visit tomorrow at ${b.time} (${name}), ${S.street}. To cancel: ${visitLink(b)}`),
  cancelledByClient: (b, name, lang) => L(lang,
    `${sender()}: Wizyta ${dm(b.date)} o ${b.time} została odwołana.${b.fee ? ` Zgodnie z regulaminem opłata za późne odwołanie wynosi ${money(b.fee, lang)}.` : ''} Do zobaczenia!`,
    `${sender()}: Your visit on ${dm(b.date)} at ${b.time} has been cancelled.${b.fee ? ` Under our terms the late cancellation fee is ${money(b.fee, lang)}.` : ''} See you soon!`),
  cancelledBySalon: (b, name, lang) => L(lang,
    `${sender()}: Przepraszamy, musimy odwołać wizytę ${dm(b.date)} o ${b.time}. Zadzwonimy, żeby ustalić nowy termin, albo wybierz go na ${link('/rezerwacja.html')}`,
    `${sender()}: We are sorry, we have to cancel your visit on ${dm(b.date)} at ${b.time}. We will call you to arrange a new time, or choose one at ${link('/rezerwacja.html')}`)
};

function emailLayout(lang, title, inner) {
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f3ece2;font-family:Helvetica,Arial,sans-serif;color:#1f2536">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3ece2;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf9;border:1px solid #e9dfd1">
<tr><td style="background:#1f2536;padding:28px 32px;text-align:center">
  <div style="font-family:Georgia,serif;font-size:20px;letter-spacing:4px;color:#d6b97f">JUSTYNA MAŃKA</div>
  <div style="font-size:10px;letter-spacing:4px;color:#ecd9aa;margin-top:6px">BEAUTY &amp; AESTHETICS</div>
</td></tr>
<tr><td style="padding:36px 32px 28px;font-size:15px;line-height:1.65">
  <h1 style="font-family:Georgia,serif;font-weight:400;font-size:24px;margin:0 0 18px">${esc(title)}</h1>
  ${inner}
</td></tr>
<tr><td style="padding:20px 32px 30px;border-top:1px solid #e9dfd1;font-size:12px;line-height:1.6;color:#6f6155">
  ${esc(S.brand)} ${esc(S.tagline)} · ${esc(S.street)}, ${esc(S.postal)} ${esc(S.city)}<br>
  ${esc(S.phone)} · <a href="mailto:${esc(S.email)}" style="color:#9c7d52">${esc(S.email)}</a>
</td></tr></table></td></tr></table></body></html>`;
}
const button = (href, label) => `<p style="margin:28px 0"><a href="${esc(href)}" style="display:inline-block;background:#1f2536;color:#ecd9aa;text-decoration:none;padding:14px 26px;letter-spacing:1px">${esc(label)}</a></p>`;
const row = (k, v) => `<tr><td style="padding:6px 16px 6px 0;color:#6f6155;vertical-align:top">${esc(k)}</td><td style="padding:6px 0">${v}</td></tr>`;

function fmtLongDate(dateStr, lang) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : 'pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const email = {
  confirmation(b, name, lang) {
    const subject = L(lang, `Potwierdzenie wizyty ${dm(b.date)}, ${b.time}`, `Your visit on ${dm(b.date)} at ${b.time}`);
    const html = emailLayout(lang, L(lang, 'Wizyta zarezerwowana', 'Your visit is booked'), `
      <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;margin-bottom:8px">
        ${row(L(lang, 'Zabieg', 'Treatment'), esc(name))}
        ${row(L(lang, 'Termin', 'Date'), esc(fmtLongDate(b.date, lang)) + ', ' + esc(b.time))}
        ${row(L(lang, 'Adres', 'Address'), esc(S.street + ', ' + S.city))}
        ${row(L(lang, 'Do zapłaty', 'To pay'), esc(money(b.total, lang)) + (b.discount_percent ? ` <span style="color:#6f6155">(${L(lang, 'zniżka', 'discount')} ${b.discount_percent}%)</span>` : ''))}
        ${row(L(lang, 'Kod rezerwacji', 'Booking code'), '<strong>' + esc(b.code) + '</strong>')}
      </table>
      ${button(visitLink(b), L(lang, 'Zobacz lub odwołaj wizytę', 'View or cancel your visit'))}
      <p style="font-size:13px;color:#6f6155">${L(lang,
        `Bezpłatnie odwołasz wizytę do ${C.booking.cancelHours} godzin przed terminem. Później albo przy nieobecności obowiązuje opłata ${C.booking.lateCancelFeePercent}% ceny zabiegu. Przypomnienie wyślemy SMS-em ${C.booking.reminderHours} godziny przed wizytą.`,
        `You can cancel free of charge up to ${C.booking.cancelHours} hours before the visit. After that, or if you do not come, a fee of ${C.booking.lateCancelFeePercent}% of the treatment price applies. We will text you a reminder ${C.booking.reminderHours} hours before the visit.`)}</p>`);
    return { subject, html };
  },
  cancelled(b, name, lang, by) {
    const subject = L(lang, `Wizyta ${dm(b.date)} odwołana`, `Visit on ${dm(b.date)} cancelled`);
    const text = by === 'salon'
      ? L(lang, 'Przepraszamy, musimy odwołać Twoją wizytę. Skontaktujemy się, żeby ustalić nowy termin.', 'We are sorry, we have to cancel your visit. We will contact you to arrange a new time.')
      : L(lang, 'Twoja wizyta została odwołana.', 'Your visit has been cancelled.');
    const fee = b.fee ? `<p>${L(lang, `Zgodnie z regulaminem opłata za odwołanie później niż ${C.booking.cancelHours} godzin przed wizytą wynosi <strong>${esc(money(b.fee, lang))}</strong>. Możesz ją uregulować przelewem albo przy następnej wizycie.`, `Under our terms, the fee for cancelling later than ${C.booking.cancelHours} hours before the visit is <strong>${esc(money(b.fee, lang))}</strong>. You can pay it by bank transfer or at your next visit.`)}</p>` : '';
    return { subject, html: emailLayout(lang, subject, `<p>${text}</p><p>${esc(name)}, ${esc(fmtLongDate(b.date, lang))}, ${esc(b.time)}.</p>${fee}${button(link('/rezerwacja.html'), L(lang, 'Zarezerwuj nowy termin', 'Book a new time'))}`) };
  },
  welcome(c, lang) {
    const subject = L(lang, 'Witaj w gronie klientek gabinetu', 'Welcome to the studio');
    return { subject, html: emailLayout(lang, L(lang, `Dzień dobry, ${c.first_name}`, `Hello, ${c.first_name}`), `
      <p>${L(lang, 'Dziękujemy za założenie konta. Na pierwszy zabieg zarezerwowany z konta masz', 'Thank you for creating an account. You get')} <strong>${C.discounts.firstVisitPercent}% ${L(lang, 'zniżki', 'off your first treatment')}</strong>${L(lang, '. Naliczy się sama w podsumowaniu rezerwacji.', ' booked from your account. It is applied automatically in the booking summary.')}</p>
      ${button(link('/rezerwacja.html'), L(lang, 'Zarezerwuj wizytę', 'Book a visit'))}`) };
  },
  reset(c, token, lang) {
    const subject = L(lang, 'Ustaw nowe hasło', 'Set a new password');
    return { subject, html: emailLayout(lang, subject, `
      <p>${L(lang, 'Ktoś poprosił o zmianę hasła do Twojego konta. Jeśli to Ty, kliknij przycisk poniżej. Link jest ważny przez godzinę.', 'Someone asked to reset the password for your account. If it was you, click the button below. The link is valid for one hour.')}</p>
      ${button(link('/konto.html?reset=' + token), L(lang, 'Ustaw nowe hasło', 'Set a new password'))}
      <p style="font-size:13px;color:#6f6155">${L(lang, 'Jeśli to nie Ty, zignoruj tę wiadomość. Hasło się nie zmieni.', 'If it was not you, ignore this message. Your password will not change.')}</p>`) };
  },
  contact(m) {
    const subject = `Wiadomość ze strony: ${m.name}`;
    return { subject, html: emailLayout('pl', 'Nowa wiadomość ze strony', `
      <table role="presentation" cellpadding="0" cellspacing="0">${row('Od', esc(m.name))}${row('Kontakt', esc(m.contact))}</table>
      <p style="white-space:pre-wrap;border-left:2px solid #d6b97f;padding-left:14px">${esc(m.message)}</p>`) };
  },
  campaign(subject, text, lang) {
    return { subject, html: emailLayout(lang, subject, `<p style="white-space:pre-wrap">${esc(text)}</p>${button(link('/rezerwacja.html'), L(lang, 'Zarezerwuj wizytę', 'Book a visit'))}
      <p style="font-size:12px;color:#6f6155">${L(lang, 'Dostajesz tę wiadomość, bo wyraziłaś zgodę na oferty e-mailem. Zgodę wycofasz w profilu:', 'You are receiving this because you agreed to email offers. You can withdraw consent in your profile:')} <a href="${esc(link('/konto.html'))}" style="color:#9c7d52">${esc(link('/konto.html'))}</a></p>`) };
  }
};

/* ---------- Kolejka i wysyłka ---------- */
function queue({ channel, kind, to, subject, body, bookingId }) {
  try {
    const r = db.prepare('INSERT INTO messages (channel, kind, to_addr, subject, body, booking_id, created_at) VALUES (?,?,?,?,?,?,?)')
      .run(channel, kind, to, subject || null, body, bookingId || null, nowIso());
    return Number(r.lastInsertRowid);
  } catch (e) {
    if (/UNIQUE/.test(e.message)) return null; // przypomnienie już było
    throw e;
  }
}
const queueSms = (kind, to, body, bookingId) => (to ? queue({ channel: 'sms', kind, to, body, bookingId }) : null);
const queueEmail = (kind, to, { subject, html }, bookingId) => (to ? queue({ channel: 'email', kind, to, subject, body: html, bookingId }) : null);

const phoneE164 = (p) => { const d = String(p).replace(/[^\d+]/g, ''); return d.startsWith('+') ? d.slice(1) : d.length === 9 ? '48' + d : d; };

async function deliver(m) {
  if (m.channel === 'sms') {
    if (env.smsDriver === 'smsapi' && env.smsapiToken) {
      const res = await fetch('https://api.smsapi.pl/sms.do', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + env.smsapiToken, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ to: phoneE164(m.to_addr), message: m.body, from: sender(), format: 'json', encoding: 'utf-8', normalize: '1' })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error('SMSAPI: ' + (data.message || res.status));
      return 'smsapi';
    }
  } else if (env.emailDriver === 'resend' && env.resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.resendKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.emailFrom || `${S.brand} <${S.email}>`, to: [m.to_addr], subject: m.subject, html: m.body, reply_to: S.email })
    });
    if (!res.ok) throw new Error('Resend: ' + res.status + ' ' + (await res.text()).slice(0, 200));
    return 'resend';
  }
  // tryb testowy
  const preview = m.channel === 'sms' ? m.body : `${m.subject}  →  (treść HTML w panelu, zakładka SMS i e-maile)`;
  const extra = m.kind === 'reset' ? '\n     Link: ' + (m.body.match(/href="([^"]*reset=[^"]*)"/) || [])[1] : '';
  console.log(`  ✉  [test] ${m.channel === 'sms' ? 'SMS' : 'E-mail'} do ${m.to_addr}: ${preview}${extra}`);
  return 'test';
}

let running = false;
async function processQueue() {
  if (running) return; running = true;
  try {
    const list = db.prepare("SELECT * FROM messages WHERE status = 'queued' ORDER BY id LIMIT 50").all();
    for (const m of list) {
      try {
        const driver = await deliver(m);
        db.prepare('UPDATE messages SET status = ?, driver = ?, sent_at = ?, error = NULL WHERE id = ?').run(driver === 'test' ? 'test' : 'sent', driver, nowIso(), m.id);
      } catch (e) {
        db.prepare("UPDATE messages SET status = 'failed', error = ? WHERE id = ?").run(String(e.message).slice(0, 300), m.id);
        console.error('  Nie udało się wysłać wiadomości', m.id, e.message);
      }
    }
  } finally { running = false; }
}

const mode = () => ({
  sms: env.smsDriver === 'smsapi' && env.smsapiToken ? 'smsapi' : 'test',
  email: env.emailDriver === 'resend' && env.resendKey ? 'resend' : 'test'
});

module.exports = { sms, email, queueSms, queueEmail, processQueue, setBaseUrl, visitLink, link, mode, emailLayout };
