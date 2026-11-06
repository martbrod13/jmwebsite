# jmwebsite
Website for the love of my lifie

---

## Prototyp strony gabinetu Justyna Mańka Beauty & Aesthetics

Klikalny prototyp strony: wygląda i działa jak gotowa strona, ale wszystko dzieje się w przeglądarce. Nic nie jest wysyłane na serwer, SMS-y są symulowane, a strona ma ustawione `noindex`, więc nie trafi do Google.

### Jak otworzyć

W terminalu VS Code, w folderze projektu:

```bash
npm run dev
```

Strona działa pod adresem http://localhost:3000 (Ctrl + klik w link w terminalu). Po zapisaniu zmian w plikach odświeża się sama. Nie trzeba nic instalować poza Node.js. Zatrzymanie: Ctrl + C.

### Co jest w środku

| Strona | Co robi |
|---|---|
| `index.html` | Strona główna: baner z logo, kategorie zabiegów, korzyści z konta, jak umówić wizytę, sekcja „O mnie” |
| `zabiegi.html` | Opisy wszystkich zabiegów w rozwijanych zakładkach, przygotowanie, przeciwwskazania, zalecenia |
| `cennik.html` | Cennik w tabelach + najczęstsze pytania |
| `rezerwacja.html` | Rezerwacja w 4 krokach: zabieg, kalendarz wolnych terminów, dane (gość / logowanie / rejestracja), potwierdzenie z podglądem SMS i plikiem do kalendarza |
| `konto.html` | Logowanie, rejestracja ze zgodami, profil: wizyty, odwoływanie, oferty, dane, zgody z historią, usuwanie konta |
| `kontakt.html` | Dane kontaktowe, godziny, formularz, mapa Google wczytywana dopiero po zgodzie |
| `galeria.html` | Miejsce na zdjęcia efektów (do uzupełnienia) |
| `panel.html` | Panel gabinetu (hasło demo: `demo`): wizyty, baza klientek z eksportem CSV, edycja cen, promocje, SMS-y, dni wolne |
| `regulamin.html`, `polityka-prywatnosci.html`, `polityka-cookies.html` | Projekty dokumentów |

Zasady działające w prototypie:
- 10% zniżki na pierwszy zabieg dla zarejestrowanych, nalicza się sama; rezerwacja jako gość bez zniżki.
- Promocje dla zarejestrowanych (święta, urodziny); zniżki się nie sumują, wybierana jest najkorzystniejsza.
- Przy każdej obniżce pokazywana jest najniższa cena z 30 dni przed obniżką (Omnibus).
- Zgody marketingowe są osobne, dobrowolne i domyślnie odznaczone; wymagana jest tylko akceptacja regulaminu i polityki prywatności.
- Bezpłatne odwołanie wizyty do 24 h przed terminem.

### Gdzie co zmieniać

- `assets/js/config.js`: dane gabinetu, godziny pracy, dni wolne, promocje
- `assets/js/treatments.js`: zabiegi, opisy, czas trwania, ceny
- `assets/css/style.css`: wygląd (kolory na górze pliku)
- Ceny można też zmieniać w panelu gabinetu; zapisują się w tej przeglądarce.

### Role i dostęp

- **Martyna Brodowska: administratorka strony.** Odpowiada za kod, hosting, bazę danych, konfigurację SMS-ów i e-maili. Ma konto w panelu (w prototypie `admin@justynamanka.pl`, hasło `demo`).
- **Justyna Mańka: właścicielka gabinetu.** Korzysta z panelu na co dzień (wizyty, klientki, ceny, promocje). Konto w prototypie: `kontakt@justynamanka.pl`, hasło `demo`.

W sensie RODO administratorem danych klientek jest firma Justyny, a administratorka strony przetwarza je w jej imieniu. Przed startem potrzebna jest między nimi umowa powierzenia przetwarzania danych.

### Baza danych

Schemat bazy PostgreSQL (Supabase) na wersję produkcyjną jest w folderze `database/`. Opis tabel i instrukcja uruchomienia: `database/README.md`.

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
- [ ] Przegląd dokumentów prawnych przez prawnika

### Wersja produkcyjna (plan)

- Next.js + baza PostgreSQL na serwerach w UE, logowanie z haszowaniem haseł i resetem przez e-mail
- Bramka SMS (np. SMSAPI) z nazwą nadawcy zarejestrowaną na firmę właścicielki, wysyłka e-maili transakcyjnych
- Czcionki hostowane lokalnie zamiast z Google Fonts (RODO)
- Hosting komercyjny (darmowy plan Vercel nie pozwala na użytek komercyjny)
- Umowy powierzenia danych z dostawcami, ochrona formularzy przed spamem, kopie zapasowe
