/* Wczytuje plik .env (jeśli istnieje) bez dodatkowych pakietów. */
// Wszystkie godziny liczymy w czasie gabinetu, niezależnie od ustawień komputera czy serwera.
process.env.TZ = 'Europe/Warsaw';
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '.env');
if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  // na serwerze strona działa za Caddy/nginx, więc słucha tylko lokalnie
  host: process.env.HOST || (process.env.NODE_ENV === 'production' || process.argv.includes('--production') ? '127.0.0.1' : undefined),
  // SITE_INDEXING=1 po starcie strony: Google może ją indeksować (robots.txt, mapa strony, bez noindex)
  indexing: /^(1|true|tak)$/i.test(process.env.SITE_INDEXING || ''),
  production: process.env.NODE_ENV === 'production' || process.argv.includes('--production'),
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
  smsDriver: process.env.SMS_DRIVER || 'outbox',
  smsapiToken: process.env.SMSAPI_TOKEN || '',
  smsSender: process.env.SMS_SENDER || '',
  emailDriver: process.env.EMAIL_DRIVER || 'outbox',
  resendKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || '',
  emailSalon: process.env.EMAIL_SALON || '',
  adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD || '',
  dataDir: process.env.DATA_DIR || path.join(__dirname, '..', 'data')
};
