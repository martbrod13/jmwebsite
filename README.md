# jmwebsite
Website for the love of my lifie

---

## Strona i system rezerwacji gabinetu Justyna Mańka Beauty & Aesthetics

Strona działa na własnym serwerze z bazą danych: konta klientek, rezerwacje, ceny, promocje i wiadomości zapisują się w bazie, a nie w przeglądarce. Na razie strona działa tylko lokalnie (localhost) i ma ustawione `noindex`, więc nie trafi do Google.

### Jak uruchomić

Potrzebny jest tylko Node.js w wersji **22.13 lub nowszej** (sprawdzisz: `node -v`; nowszą wersję pobierzesz z nodejs.org, wersja LTS). Nie trzeba nic instalować przez npm.

W terminalu VS Code, w folderze projektu:

```bash
npm run dev
```

- Strona: http://localhost:3000 (Ctrl + klik w link w terminalu)
- Panel gabinetu: http://localhost:3000/panel.html, konta z `config.js`, hasło startowe `demo` (zmień je w panelu: Moje konto)
- Po zapisaniu zmian w plikach strona odświeża się sama, a serwer restartuje się po zmianach w kodzie.
- Zatrzymanie: Ctrl + C

Testy najważniejszych zasad (podwójne rezerwacje, ceny i zniżki liczone przez serwer, opłaty, logowanie, ochrona panelu):

```bash
npm test
```

### SMS-y i e-maile: tryb testowy

Domyślnie nic nie wychodzi do klientek. Każdy SMS i e-mail (potwierdzenie, przypomnienie, odwołanie, reset hasła, kampania) pojawia się w terminalu i w panelu w zakładce **SMS-y i e-maile**, gdzie można też obejrzeć e-maile tak, jak zobaczy je klientka. Link do resetu hasła znajdziesz w terminalu.

Prawdziwa wysyłka włącza się w pliku `.env` (wzór: `.env.example`): SMS przez SMSAPI.pl, e-maile przez Resend. Potrzebne będą konta na firmę właścicielki i zarejestrowana nazwa nadawcy SMS. Klientki i wizyty przykładowe nigdy nie dostają wiadomości.

### Dane

- Baza to jeden plik: `data/jm.db` (SQLite wbudowany w Node.js). Nie trafia do repozytorium (`.gitignore`), bo będą w nim dane osobowe.
- Przy pierwszym uruchomieniu tworzą się konta panelu, promocje i kilka przykładowych klientek i wizyt. W panelu na Pulpicie jest przycisk **Usuń dane przykładowe**.
- Żeby zacząć od zera: zatrzymaj serwer i usuń folder `data`.
- Zdjęcia z galerii zapisują się w `data/uploads/gallery`.
- Kopia zapasowa: skopiuj cały folder `data` przy zatrzymanym serwerze.

### Co jest w środku

| Strona | Co robi |
|---|---|
| `index.html` | Strona główna: baner z logo, kategorie zabiegów, korzyści z konta, jak umówić wizytę, sekcja „O mnie” |
| `zabiegi.html` | Opisy wszystkich zabiegów w rozwijanych zakładkach, przygotowanie, przeciwwskazania, zalecenia |
| `cennik.html` | Cennik w tabelach + najczęstsze pytania |
| `rezerwacja.html` | Rezerwacja w 4 krokach: zabieg, kalendarz wolnych terminów, dane (gość / logowanie / rejestracja), potwierdzenie z podglądem SMS i plikiem do kalendarza |
| `konto.html` | Logowanie, rejestracja ze zgodami, reset hasła przez e-mail, profil: wizyty, odwoływanie, oferty, dane, zgody z historią, usuwanie konta |
| `galeria.html` | Galeria efektów ze zdjęciami dodanymi w panelu: filtr kategorii, powiększenie (strzałki, przesuwanie palcem). Bez zdjęć pokazuje odnośnik do Instagrama |
| `wizyta.html` | Strona wizyty z linku w SMS-ie i e-mailu: podgląd, zmiana terminu i odwołanie bez logowania (adres `/w/<klucz>`) |
| `kontakt.html` | Dane kontaktowe, godziny, formularz, mapa Google wczytywana dopiero po zgodzie |
| `panel.html` | Panel gabinetu: kalendarz tygodnia (wizyty z telefonu i Instagrama, blokowanie godzin, przenoszenie), wizyty (odwołanie, nieobecność, opłaty), klientki z eksportem CSV, ceny z historią, promocje, galeria (zdjęcia ze zgodą klientki, opis PL/EN, ukrywanie, kolejność), SMS-y i e-maile, dni wolne, zmiana hasła |
| `regulamin.html`, `polityka-prywatnosci.html`, `polityka-cookies.html` | Projekty dokumentów |

Zasady:
- 10% zniżki na pierwszy zabieg dla zarejestrowanych, nalicza się sama; rezerwacja jako gość bez zniżki.
- Promocje dla zarejestrowanych (święta, urodziny); zniżki się nie sumują, wybierana jest najkorzystniejsza.
- Przy każdej obniżce pokazywana jest najniższa cena z 30 dni przed obniżką (Omnibus).
- Zgody marketingowe są osobne, dobrowolne i domyślnie odznaczone; wymagana jest tylko akceptacja regulaminu i polityki prywatności.
- Bezpłatne odwołanie wizyty do 12 h przed terminem; później lub przy nieobecności opłata 50% ceny zabiegu.
- Automatyczny SMS z przypomnieniem 24 h przed wizytą (serwer sprawdza co minutę, które przypomnienia wysłać).
- Nieobecność oznaczona w panelu nalicza opłatę 50%; opłatę można oznaczyć jako zapłaconą albo anulować.
- Wizyty umówione telefonicznie, przez Instagram albo w gabinecie wpisuje się w panelu (Kalendarz). Od razu znikają z rezerwacji online, tak samo jak zablokowane godziny (przerwa, wyjście). Dwie wizyty nie mogą na siebie nachodzić; wizytę poza godzinami pracy panel zapisze po potwierdzeniu.
- Klientka może sama zmienić termin (w profilu albo przez link z SMS-a) najpóźniej 12 h przed wizytą, tylko na wolny termin. Dostaje SMS z nowym terminem, a przypomnienie wyśle się do nowej godziny.
- Strona ma wersję angielską (przełącznik PL / EN w nagłówku). Domyślnie i przy pierwszej wizycie strona jest po polsku; wybór języka zapamiętuje przeglądarka. Panel gabinetu jest zawsze po polsku, a rezerwacje zapisują polską nazwę zabiegu. Dokumenty prawne mają tłumaczenie z dopiskiem, że wiążąca jest wersja polska.

### Gdzie co zmieniać

- `assets/js/config.js`: dane gabinetu, godziny pracy, dni wolne, promocje
- `assets/js/treatments.js`: zabiegi, opisy, czas trwania, ceny
- `assets/js/treatments.en.js`: angielskie nazwy i opisy zabiegów (te same identyfikatory co w `treatments.js`)
- `assets/js/i18n.js`: przełączanie języka. Teksty w skryptach: `JM.L('po polsku', 'in English')`; w HTML: `<span data-lang="pl">…</span><span data-lang="en">…</span>`
- `assets/css/style.css`: wygląd (kolory na górze pliku)
- `server/`: serwer, API, zasady rezerwacji (`booking.js`), SMS-y i e-maile (`messaging.js`)
- Ceny można też zmieniać w panelu gabinetu; zapisują się w bazie z historią zmian i mają pierwszeństwo przed cenami z `treatments.js`.

### Role i dostęp

- **Martyna Brodowska: administratorka strony.** Odpowiada za kod, hosting, bazę danych, konfigurację SMS-ów i e-maili. Ma konto w panelu (`martbrod99@gmail.com`).
- **Justyna Mańka: właścicielka gabinetu.** Korzysta z panelu na co dzień (wizyty, klientki, ceny, promocje). Konto w panelu: `kontakt@justynamanka.pl`.

W sensie RODO administratorem danych klientek jest firma Justyny, a administratorka strony przetwarza je w jej imieniu. Przed startem potrzebna jest między nimi umowa powierzenia przetwarzania danych.

### Bezpieczeństwo

- Hasła zapisane wyłącznie jako skrót scrypt z solą; sesje w ciasteczkach HttpOnly, SameSite=Lax.
- Limity prób logowania, rejestracji, resetu hasła, rezerwacji i formularza kontaktowego.
- Ochrona przed wysyłaniem formularzy z innych stron (sprawdzanie nagłówka Origin, tylko JSON).
- Nagłówki bezpieczeństwa (Content-Security-Policy, X-Frame-Options itp.), czcionki i zdjęcia z własnego serwera, bez Google Fonts.
- Serwer udostępnia tylko pliki strony; baza, kod serwera i `.env` są niedostępne z przeglądarki.
- Link do wizyty w SMS-ie zawiera długi losowy klucz, którego nie da się zgadnąć.

### Baza danych na produkcję

Lokalnie i na małym serwerze (VPS) wystarczy SQLite z codzienną kopią pliku. Jeśli zdecydujemy się na Supabase, schemat PostgreSQL z tymi samymi zasadami jest w folderze `database/` (opis: `database/README.md`).

### Do uzupełnienia przed publikacją

- [ ] Pisemna zgoda właścicielki na stronę i publikację jej danych, zdjęć i opisu
- [ ] Pełna nazwa firmy i NIP (regulamin, polityka prywatności, stopka)
- [ ] Kod pocztowy: 30-001 nie pasuje do ul. Kościuszki (sprawdzić, prawdopodobnie 30-105 lub 30-114)
- [ ] Bezpośredni link do profilu na Facebooku
- [ ] Godziny otwarcia
- [ ] Prawdziwy cennik (obecnie średnie z krakowskich gabinetów, listopad 2026)
- [ ] Potwierdzenie ukończonych szkoleń (nazwa i data z certyfikatów), kierunek studiów na UJ
- [ ] Logo w wektorze (SVG) i oryginał zdjęcia z banera w pełnej rozdzielczości
- [ ] Zdjęcia do galerii, każde z pisemną zgodą klientki na publikację wizerunku
- [ ] Przegląd dokumentów prawnych przez prawnika, w tym zapisu o opłacie 50% za późne odwołanie (ustawa o prawach konsumenta, klauzule niedozwolone)
- [ ] Sprawdzenie angielskich tekstów przez właścicielkę

### Publikacja (po zgodzie właścicielki)

1. Domena (np. justynamanka.pl) i serwer z Node.js 22+, np. mały VPS w UE. Darmowy plan Vercel nie pozwala na użytek komercyjny i nie trzyma pliku bazy.
2. Plik `.env` na serwerze: `PUBLIC_URL`, `ADMIN_INITIAL_PASSWORD`, klucze SMSAPI i Resend.
3. Uruchomienie: `npm start` (tryb produkcyjny: bez automatycznego odświeżania, z HSTS i pamięcią podręczną zdjęć), za serwerem HTTPS (np. Caddy albo nginx).
4. Usunięcie `noindex` z podstron i `Disallow: /` z `robots.txt`, mapa strony, wizytówka Google.
5. Codzienna kopia zapasowa bazy poza serwerem.
