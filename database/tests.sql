-- Testy schematu: uruchom po schema.sql i seed.sql (na bazie testowej, zmienia dane przykładowe).
SET search_path = salon, public, extensions;
\echo '--- liczby wierszy'
SELECT (SELECT count(*) FROM categories) kategorie, (SELECT count(*) FROM treatments) zabiegi, (SELECT count(*) FROM clients) klientki, (SELECT count(*) FROM bookings) wizyty, (SELECT count(*) FROM consent_log) log_zgod, (SELECT count(*) FROM treatment_price_history) historia_cen;
\echo '--- wolne terminy 16.11.2026 dla zabiegu 45 min (zajęte: 10:00-10:45, 13:00-15:30)'
SELECT string_agg(to_char(starts_at AT TIME ZONE 'Europe/Warsaw', 'HH24:MI'), ' ') FROM available_slots('2026-11-16', 45);
\echo '--- niedziela 15.11 i Wigilia 24.12: brak terminów'
SELECT (SELECT count(*) FROM available_slots('2026-11-15', 45)) niedziela, (SELECT count(*) FROM available_slots('2026-12-24', 45)) wigilia;
\echo '--- baza klientek'
SELECT first_name, last_name, has_account, visits, to_char(last_visit AT TIME ZONE 'Europe/Warsaw','DD.MM HH24:MI') ostatnia, marketing_sms, marketing_email FROM v_clients_overview ORDER BY last_name;
\echo '--- odbiorczynie kampanii SMS'
SELECT first_name, phone FROM v_sms_campaign_recipients ORDER BY 1;
\echo '--- wizyty z rabatem (kolumna total liczona automatycznie)'
SELECT t.name, b.price, b.discount_percent, b.total, b.promotion_id FROM bookings b JOIN treatments t ON t.id=b.treatment_id WHERE b.promotion_id IS NOT NULL;
\echo '--- Omnibus: zmiana ceny i najniższa cena z 30 dni'
UPDATE treatments SET price = 300 WHERE id = 'kwas-migdalowy';
SELECT price AS cena_teraz, lowest_price_30d('kwas-migdalowy') AS najnizsza_30_dni FROM treatments WHERE id='kwas-migdalowy';
\echo '--- historia zgód Karoliny'
SELECT type, granted, source FROM consent_log WHERE client_id='a0000000-0000-4000-8000-000000000003' ORDER BY id;
\set ON_ERROR_STOP 0
\echo '--- TEST: nakładająca się wizyta (ma się NIE udać)'
INSERT INTO bookings (client_id, treatment_id, starts_at, ends_at, booked_via, price) VALUES ('a0000000-0000-4000-8000-000000000004','mezo-twarz', '2026-11-16 10:30+01', '2026-11-16 11:15+01','guest',450);
\echo '--- TEST: druga zniżka powitalna dla Marty (ma się NIE udać)'
INSERT INTO bookings (client_id, treatment_id, starts_at, ends_at, booked_via, price, promotion_id, discount_percent) VALUES ('a0000000-0000-4000-8000-000000000002','mezo-twarz', '2026-11-20 10:00+01', '2026-11-20 10:45+01','account',450,'powitalna',10);
\echo '--- TEST: edycja historii zgód (ma się NIE udać)'
UPDATE consent_log SET granted = true WHERE id = 1;
\echo '--- TEST: konto bez danych logowania (ma się NIE udać)'
INSERT INTO clients (first_name,last_name,email,phone,has_account) VALUES ('X','Y','x@example.com','600000000',true);
\echo '--- TEST: odwołana wizyta zwalnia termin'
UPDATE bookings SET status='cancelled', cancelled_at=now(), cancelled_by='client' WHERE treatment_id='mezo-twarz' AND starts_at='2026-11-16 10:00+01';
SELECT count(*) AS wolne_10_00 FROM available_slots('2026-11-16', 45) WHERE starts_at = '2026-11-16 10:00+01';
\echo '--- TEST: usunięcie konta (anonimizacja)'
SELECT anonymize_client('a0000000-0000-4000-8000-000000000002');
SELECT first_name, last_name, email, phone, has_account, deleted_at IS NOT NULL AS usuniete FROM clients WHERE id='a0000000-0000-4000-8000-000000000002';
SELECT count(*) AS wizyty_zostaly FROM bookings WHERE client_id='a0000000-0000-4000-8000-000000000002';
SELECT count(*) AS w_bazie_klientek FROM v_clients_overview WHERE id='a0000000-0000-4000-8000-000000000002';
