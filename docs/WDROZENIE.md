# Publikacja strony krok po kroku

Ta instrukcja prowadzi od strony działającej na localhoście do strony pod własną domeną, z prawdziwymi SMS-ami i e-mailami. Całość zajmuje około godziny, nie licząc czekania na rejestrację nazwy nadawcy SMS i na DNS.

Zrób ją dopiero po pisemnej zgodzie właścicielki. Konta (domena, serwer, SMS, e-mail) najlepiej zakładać na jej firmę.

---

## 0. Lista przed startem

**Treść (pliki w repozytorium)**
- [ ] `assets/js/config.js`: pełna nazwa firmy, NIP, kod pocztowy, bezpośredni link do Facebooka, godziny otwarcia, dni zamknięte w nowym roku
- [ ] `assets/js/config.js`: `demoNotice: false` (znika dopisek „Wersja demonstracyjna strony” w stopce)
- [ ] `assets/js/treatments.js`: prawdziwe zabiegi, czasy i ceny; `treatments.en.js` to samo po angielsku
- [ ] Teksty angielskie sprawdzone przez właścicielkę albo wyłączony przełącznik języka
- [ ] Regulamin i polityka prywatności sprawdzone przez prawnika (zwłaszcza opłata 50% za późne odwołanie)
- [ ] Umowa powierzenia przetwarzania danych między firmą właścicielki a administratorką strony

**Konta do założenia (na firmę właścicielki)**
- [ ] Domena, np. `justynamanka.pl`
- [ ] Serwer VPS w UE z Ubuntu 24.04 (wystarczy 1 GB RAM)
- [ ] SMSAPI.pl: konto firmowe, **od razu zgłoś nazwę nadawcy „JM Beauty”** (zatwierdzenie trwa)
- [ ] Resend.com: konto i weryfikacja domeny (rekordy DNS, krok 6)

---

## 1. Domena

W panelu rejestratora domeny dodaj rekordy DNS wskazujące na adres IP serwera:

| Typ | Nazwa | Wartość |
|---|---|---|
| A | `@` | adres IP serwera |
| A | `www` | adres IP serwera |

Zmiana DNS zaczyna działać po kilku minutach, czasem po kilku godzinach.

## 2. Serwer

Zaloguj się na serwer przez SSH (`ssh root@ADRES_IP`) i zainstaluj potrzebne programy:

```bash
apt update && apt upgrade -y
apt install -y git ufw

# Node.js 22 (wersja z Ubuntu jest za stara) — według instrukcji NodeSource:
# https://github.com/nodesource/distributions
node -v   # musi pokazać v22.13 lub nowszą

# Caddy (HTTPS) — według oficjalnej instrukcji dla Ubuntu:
# https://caddyserver.com/docs/install#debian-ubuntu-raspbian

# Zapora: tylko SSH i strona
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable

# Osobny użytkownik dla strony i folder na kod
adduser --system --group --home /var/lib/jm jm
mkdir -p /srv/jmwebsite && chown jm:jm /srv/jmwebsite
```

## 3. Kod strony

Repozytorium jest prywatne. Najprościej dodać na GitHubie **klucz tylko do odczytu** (Settings → Deploy keys):

```bash
sudo -u jm mkdir -p /var/lib/jm/.ssh
sudo -u jm ssh-keygen -t ed25519 -N "" -f /var/lib/jm/.ssh/id_ed25519
cat /var/lib/jm/.ssh/id_ed25519.pub   # wklej na GitHubie jako Deploy key (bez prawa zapisu)

sudo -u jm git clone git@github.com:martbrod13/jmwebsite.git /srv/jmwebsite   # na pytanie o klucz GitHuba wpisz yes
sudo -u jm mkdir -p /srv/jmwebsite/data
```

## 4. Plik `.env` na serwerze

```bash
sudo -u jm nano /srv/jmwebsite/.env
```

```ini
PUBLIC_URL=https://justynamanka.pl
# hasło startowe do panelu (min. 12 znaków); po pierwszym logowaniu panel poprosi o zmianę
ADMIN_INITIAL_PASSWORD=wymyśl-długie-hasło

SMS_DRIVER=smsapi
SMSAPI_TOKEN=token-z-panelu-SMSAPI
SMS_SENDER=JM Beauty

EMAIL_DRIVER=resend
RESEND_API_KEY=klucz-z-Resend
EMAIL_FROM=Justyna Mańka Beauty & Aesthetics <kontakt@justynamanka.pl>
EMAIL_SALON=kontakt@justynamanka.pl

# na początku 0 — strona działa, ale Google jej nie widzi (krok 8)
SITE_INDEXING=0
```

```bash
chmod 600 /srv/jmwebsite/.env
```

Na serwerze baza startuje pusta, bez danych przykładowych.

## 5. Uruchomienie

```bash
cp /srv/jmwebsite/deploy/jm.service /etc/systemd/system/jm.service
systemctl daemon-reload && systemctl enable --now jm
systemctl status jm          # powinno być „active (running)”
journalctl -u jm -n 30       # komunikaty serwera

cp /srv/jmwebsite/deploy/Caddyfile /etc/caddy/Caddyfile   # wcześniej popraw domenę w pliku
systemctl reload caddy
```

Otwórz `https://justynamanka.pl`. Certyfikat HTTPS Caddy zakłada sam przy pierwszym wejściu.

## 6. E-maile (Resend)

W panelu Resend dodaj domenę i wpisz u rejestratora rekordy DNS, które pokaże (SPF i DKIM). Bez tego e-maile mogą trafiać do spamu. Adres w `EMAIL_FROM` musi być w tej domenie.

## 7. Test przed ogłoszeniem

- [ ] Panel: logowanie hasłem z `.env`, zmiana hasła na własne (oba konta)
- [ ] Rezerwacja na **swój** numer telefonu i e-mail: przychodzi SMS i e-mail, link z SMS-a otwiera wizytę
- [ ] Zmiana terminu i odwołanie z linku
- [ ] Wizyta dodana w panelu znika z rezerwacji online
- [ ] Formularz kontaktowy dochodzi na `EMAIL_SALON`
- [ ] Panel → SMS-y i e-maile: brak błędów wysyłki
- [ ] Panel → Moje konto: „Zrób kopię teraz” działa

## 8. Włączenie Google

```bash
sed -i 's/^SITE_INDEXING=0/SITE_INDEXING=1/' /srv/jmwebsite/.env && systemctl restart jm
```

Od tej chwili publiczne strony mają `index, follow`, adres kanoniczny i podgląd przy udostępnianiu (Facebook, Instagram, WhatsApp). `robots.txt` wpuszcza wyszukiwarki, a panel, konto i strony wizyt zostają ukryte.

Potem:
1. Google Search Console: dodaj domenę i zgłoś mapę strony `https://justynamanka.pl/sitemap.xml`.
2. Wizytówka Google (Google Business Profile): adres strony i link do rezerwacji `https://justynamanka.pl/rezerwacja.html`.
3. Instagram i Facebook: link do strony w opisie profilu.

## 9. Na co dzień

**Aktualizacja strony** po zmianach w repozytorium:
```bash
cd /srv/jmwebsite && sudo -u jm git pull && systemctl restart jm
```

**Kopie zapasowe**: serwer robi kopię bazy codziennie po 3:00 (14 ostatnich) i kopię zdjęć w `data/backups`. Raz w tygodniu pobierz kopię w panelu (Moje konto → Pobierz kopię bazy) i zapisz poza serwerem. Dobrze też włączyć kopie zapasowe całego serwera u dostawcy VPS.

**Przywrócenie z kopii**:
```bash
systemctl stop jm
cp /srv/jmwebsite/data/backups/jm-RRRR-MM-DD_GGMM.db /srv/jmwebsite/data/jm.db
rm -f /srv/jmwebsite/data/jm.db-wal /srv/jmwebsite/data/jm.db-shm
systemctl start jm
```

**Czy strona działa**: darmowy monitoring (np. UptimeRobot) na adres `https://justynamanka.pl/api/health` wyśle e-mail, gdy strona przestanie odpowiadać.

**Aktualizacje systemu**: raz w miesiącu `apt update && apt upgrade -y` i restart serwera.
