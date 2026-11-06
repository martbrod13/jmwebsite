/*
 * Serwer korzysta z tych samych danych co strona: assets/js/config.js i treatments.js.
 * Dzięki temu zabiegi, godziny i zasady edytuje się w jednym miejscu.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load() {
  const ctx = { window: {} };
  ctx.window.JM = {};
  ctx.JM = ctx.window.JM;
  vm.createContext(ctx);
  for (const f of ['config.js', 'treatments.js', 'questionnaire.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', f), 'utf8'), ctx, { filename: f });
  }
  // kopia „na czysto”, bez obiektów z kontekstu vm
  const out = JSON.parse(JSON.stringify(ctx.JM));
  // angielskie nazwy zabiegów do SMS-ów i e-maili dla klientek z wersji EN
  ctx.JM.lang = 'en';
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'treatments.en.js'), 'utf8'), ctx, { filename: 'treatments.en.js' });
  out.namesEn = {};
  [ctx.JM.consultation].concat(ctx.JM.treatments).forEach((t) => { out.namesEn[t.id] = t.name; });
  return out;
}

module.exports = load();
