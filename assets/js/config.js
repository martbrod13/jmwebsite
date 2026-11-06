/*
 * Dane gabinetu — jedno miejsce do edycji.
 * Pola oznaczone TODO trzeba potwierdzić z właścicielką przed publikacją.
 */
window.JM = window.JM || {};

JM.salon = {
  brand: 'Justyna Mańka',
  tagline: 'Beauty & Aesthetics',
  owner: 'Justyna Mańka',
  // TODO: pełna nazwa firmy i NIP z CEIDG — potrzebne w polityce prywatności i regulaminie
  company: '[pełna nazwa firmy z CEIDG]',
  nip: '[NIP]',
  street: 'ul. Tadeusza Kościuszki 52A',
  postal: '30-001', // TODO: sprawdzić — ul. Kościuszki ma kody 30-105 / 30-114
  city: 'Kraków',
  phone: '+48 510 680 831',
  phoneHref: '+48510680831',
  email: 'kontakt@justynamanka.pl',
  instagram: { label: 'justynamanka_kosmetolog', url: 'https://www.instagram.com/justynamanka_kosmetolog/' },
  // TODO: wkleić bezpośredni link do profilu na Facebooku
  facebook: { label: 'Justyna Mańka Beauty & Aesthetics', url: 'https://www.facebook.com/search/top?q=Justyna%20Ma%C5%84ka%20Beauty%20%26%20Aesthetics' },
  mapQuery: 'Tadeusza Kościuszki 52A, Kraków',
  smsSender: 'JM Beauty',
  // dopisek „Wersja demonstracyjna strony” w stopce — przed startem ustaw false
  demoNotice: true
};

// Godziny pracy: [otwarcie, zamknięcie] w pełnych godzinach; null = nieczynne. 0 = niedziela.
// TODO: potwierdzić godziny z właścicielką
// Konta do panelu gabinetu (w prototypie hasło demo: „demo”)
JM.panelAccounts = [
  { email: 'kontakt@justynamanka.pl', name: 'Justyna Mańka', role: 'Właścicielka gabinetu' },
  { email: 'martbrod99@gmail.com', name: 'Martyna Brodowska', role: 'Administratorka strony' }
];

JM.hours = {
  1: [9, 19],
  2: [9, 19],
  3: [11, 20],
  4: [9, 19],
  5: [9, 17],
  6: [9, 14],
  0: null
};

JM.dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
JM.dayShort = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
JM.monthNames = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
JM.monthGen = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

// Dni ustawowo wolne — gabinet nieczynny (Wigilia jest dniem wolnym od 2025 r.)
JM.closedDates = [
  '2026-11-11', '2026-12-24', '2026-12-25', '2026-12-26',
  '2027-01-01', '2027-01-06', '2027-03-28', '2027-03-29', '2027-05-01', '2027-05-03'
];

JM.booking = {
  slotStep: 30,          // co ile minut zaczynają się terminy
  daysAhead: 60,         // jak daleko w przód można rezerwować
  minLeadHours: 3,       // najwcześniej X godzin od teraz
  cancelHours: 12,       // bezpłatne odwołanie do X godzin przed wizytą
  lateCancelFeePercent: 50, // opłata za późniejsze odwołanie lub nieobecność (% ceny zabiegu)
  reminderHours: 24      // automatyczny SMS z przypomnieniem X godzin przed wizytą
};

JM.discounts = {
  firstVisitPercent: 10
};

// Promocje dla zarejestrowanych klientek (edytowalne w panelu gabinetu)
JM.defaultPromos = [
  {
    id: 'swieta-2026',
    title: 'Świąteczna pielęgnacja',
    text: '15% taniej na mezoterapię i stymulatory tkankowe dla zarejestrowanych klientek.',
    percent: 15,
    categories: ['mezoterapia', 'stymulatory'],
    from: '2026-12-01',
    to: '2026-12-23',
    membersOnly: true,
    active: true
  },
  {
    id: 'urodziny',
    title: 'Prezent urodzinowy',
    text: '10% zniżki na dowolny zabieg w miesiącu Twoich urodzin.',
    percent: 10,
    categories: 'all',
    from: '2026-01-01',
    to: '2027-12-31',
    membersOnly: true,
    birthday: true,
    active: true
  }
];
