-- =====================================================================
--  Justyna Mańka Beauty & Aesthetics — schemat bazy danych
--  PostgreSQL 15+ (zgodny z Supabase). Strefa czasowa gabinetu: Europe/Warsaw.
--
--  Kolejność uruchamiania:  schema.sql  →  seed.sql
--  Skrypt da się uruchomić ponownie: na początku usuwa schemat `salon`.
-- =====================================================================

-- Rozszerzenia trzymamy w schemacie `extensions` (tak robi Supabase)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto   WITH SCHEMA extensions;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext     WITH SCHEMA extensions;  -- e-maile bez rozróżniania wielkości liter
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;  -- indeksy GiST (blokada nakładających się wizyt)

DROP SCHEMA IF EXISTS salon CASCADE;
CREATE SCHEMA salon;
SET search_path = salon, public, extensions;

-- ---------------------------------------------------------------------
--  Typy wyliczeniowe
-- ---------------------------------------------------------------------
CREATE TYPE booking_status AS ENUM ('confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE consent_type   AS ENUM ('terms', 'privacy', 'marketing_sms', 'marketing_email');
CREATE TYPE sms_type       AS ENUM ('confirmation', 'reminder', 'cancellation', 'campaign');
CREATE TYPE sms_status     AS ENUM ('queued', 'sent', 'delivered', 'failed');
CREATE TYPE promotion_kind AS ENUM ('first_visit', 'seasonal', 'birthday');

-- Wspólny trigger: aktualizacja kolumny updated_at
CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- =====================================================================
--  ADMINS — konto właścicielki (i ewentualnie pracownic) do panelu
-- =====================================================================
CREATE TABLE admins (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id   uuid UNIQUE,              -- przy Supabase Auth: id z auth.users
  email          citext NOT NULL UNIQUE,
  full_name      text   NOT NULL,
  role           text   NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  password_hash  text,                     -- tylko gdy logowanie bez Supabase Auth (bcrypt/argon2)
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz
);
COMMENT ON TABLE admins IS 'Konta do panelu gabinetu. Zalecane logowanie dwuskładnikowe.';

-- =====================================================================
--  CLIENTS — klientki z kontem i goście (jedna osoba = jeden wiersz)
-- =====================================================================
CREATE TABLE clients (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id   uuid UNIQUE,              -- przy Supabase Auth: id z auth.users
  first_name     text   NOT NULL CHECK (length(trim(first_name)) > 0),
  last_name      text   NOT NULL CHECK (length(trim(last_name)) > 0),
  email          citext NOT NULL CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  phone          text   NOT NULL CHECK (phone ~ '^\+?[0-9 ]{9,16}$'),
  birth_month    smallint CHECK (birth_month BETWEEN 1 AND 12),
  has_account    boolean NOT NULL DEFAULT false,
  password_hash  text,                     -- tylko gdy logowanie bez Supabase Auth
  salon_notes    text,                     -- notatki gabinetu; NIE zapisywać tu danych o zdrowiu
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,              -- konto usunięte (dane zanonimizowane)
  CONSTRAINT account_needs_login CHECK (NOT has_account OR auth_user_id IS NOT NULL OR password_hash IS NOT NULL)
);
-- Ten sam e-mail = ta sama osoba. Gość, który zakłada konto, dostaje has_account = true w tym samym wierszu.
CREATE UNIQUE INDEX clients_email_unique ON clients (email) WHERE deleted_at IS NULL;
CREATE INDEX clients_phone_idx ON clients (phone);
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
COMMENT ON TABLE clients IS 'Klientki. Goście mają has_account = false. Dane o zdrowiu (karta konsultacyjna) trzymamy poza tą bazą.';

-- =====================================================================
--  CONSENTS + CONSENT_LOG — aktualne zgody i pełna historia zmian (RODO)
-- =====================================================================
CREATE TABLE consents (
  client_id        uuid NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  type             consent_type NOT NULL,
  granted          boolean NOT NULL,
  source           text NOT NULL CHECK (source IN ('registration', 'booking', 'profile', 'salon', 'anonymization')),
  document_version text,                   -- np. 'regulamin-2026-11' przy akceptacji dokumentów
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, type)
);

CREATE TABLE consent_log (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id        uuid NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  type             consent_type NOT NULL,
  granted          boolean NOT NULL,
  source           text NOT NULL,
  document_version text,
  changed_at       timestamptz NOT NULL DEFAULT now(),
  ip_address       inet,
  user_agent       text
);
CREATE INDEX consent_log_client_idx ON consent_log (client_id, changed_at DESC);
COMMENT ON TABLE consent_log IS 'Historia zgód: tylko dopisywanie, bez zmian i usuwania. Dowód udzielenia i wycofania zgody.';

-- Każda zmiana w consents trafia automatycznie do consent_log
CREATE FUNCTION log_consent_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.granted IS DISTINCT FROM OLD.granted OR NEW.document_version IS DISTINCT FROM OLD.document_version THEN
    INSERT INTO consent_log (client_id, type, granted, source, document_version, changed_at)
    VALUES (NEW.client_id, NEW.type, NEW.granted, NEW.source, NEW.document_version, NEW.updated_at);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER consents_log AFTER INSERT OR UPDATE ON consents FOR EACH ROW EXECUTE FUNCTION log_consent_change();

CREATE FUNCTION consent_log_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'consent_log jest tylko do dopisywania';
END $$;
CREATE TRIGGER consent_log_no_update BEFORE UPDATE ON consent_log FOR EACH ROW EXECUTE FUNCTION consent_log_append_only();

-- =====================================================================
--  CATEGORIES + TREATMENTS — zabiegi, opisy, czas, ceny
-- =====================================================================
CREATE TABLE categories (
  id                text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),   -- slug używany w adresach
  name              text NOT NULL,
  lead              text,
  about             text,
  preparation       text[] NOT NULL DEFAULT '{}',
  contraindications text[] NOT NULL DEFAULT '{}',
  aftercare         text[] NOT NULL DEFAULT '{}',
  sort_order        smallint NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true
);

CREATE TABLE treatments (
  id                 text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  category_id        text NOT NULL REFERENCES categories (id) ON UPDATE CASCADE,
  name               text NOT NULL,
  short_description  text,
  what_is            text,                 -- Czym jest
  how_it_works       text,                 -- Na czym polega
  helps_with         text[] NOT NULL DEFAULT '{}',   -- Na co pomaga
  when_to_use        text,                 -- Kiedy się go stosuje
  benefits           text[] NOT NULL DEFAULT '{}',   -- Zalety
  procedure          text,                 -- Jak przebiega
  results            text,                 -- Efekty i trwałość
  recommended_series text,                 -- Zalecana seria
  duration_min       smallint NOT NULL CHECK (duration_min BETWEEN 10 AND 480),
  price              numeric(8,2) NOT NULL CHECK (price >= 0),
  price_is_from      boolean NOT NULL DEFAULT false,  -- cena „od”
  sort_order         smallint NOT NULL DEFAULT 0,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX treatments_category_idx ON treatments (category_id, sort_order);
CREATE TRIGGER treatments_updated_at BEFORE UPDATE ON treatments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Historia cen: potrzebna do „najniższej ceny z 30 dni przed obniżką” (Omnibus)
CREATE TABLE treatment_price_history (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  treatment_id  text NOT NULL REFERENCES treatments (id) ON DELETE CASCADE ON UPDATE CASCADE,
  price         numeric(8,2) NOT NULL,
  valid_from    timestamptz NOT NULL DEFAULT now(),
  valid_to      timestamptz,
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);
CREATE INDEX price_history_idx ON treatment_price_history (treatment_id, valid_from);

CREATE FUNCTION track_price_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO treatment_price_history (treatment_id, price) VALUES (NEW.id, NEW.price);
  ELSIF NEW.price IS DISTINCT FROM OLD.price THEN
    UPDATE treatment_price_history SET valid_to = now()
     WHERE treatment_id = NEW.id AND valid_to IS NULL;
    INSERT INTO treatment_price_history (treatment_id, price) VALUES (NEW.id, NEW.price);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER treatments_price_history AFTER INSERT OR UPDATE OF price ON treatments
  FOR EACH ROW EXECUTE FUNCTION track_price_change();

-- Najniższa cena zabiegu w ciągu 30 dni przed wskazanym momentem
CREATE FUNCTION lowest_price_30d(p_treatment text, p_at timestamptz DEFAULT now())
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT min(price)
    FROM treatment_price_history
   WHERE treatment_id = p_treatment
     AND valid_from <= p_at
     AND (valid_to IS NULL OR valid_to > p_at - interval '30 days');
$$;

-- =====================================================================
--  PROMOTIONS — zniżka powitalna, promocje sezonowe i urodzinowe
-- =====================================================================
CREATE TABLE promotions (
  id              text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  kind            promotion_kind NOT NULL,
  name            text NOT NULL,
  description     text,
  percent         numeric(5,2) NOT NULL CHECK (percent > 0 AND percent <= 50),
  members_only    boolean NOT NULL DEFAULT true,
  applies_to_all  boolean NOT NULL DEFAULT true,   -- false = tylko kategorie z promotion_categories
  valid_from      date NOT NULL,
  valid_to        date NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_to >= valid_from)
);
-- Jest tylko jedna zniżka powitalna
CREATE UNIQUE INDEX one_first_visit_promotion ON promotions (kind) WHERE kind = 'first_visit';

CREATE TABLE promotion_categories (
  promotion_id  text NOT NULL REFERENCES promotions (id) ON DELETE CASCADE,
  category_id   text NOT NULL REFERENCES categories (id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (promotion_id, category_id)
);

-- =====================================================================
--  WORKING_HOURS + DAYS_OFF — godziny pracy i dni wolne
-- =====================================================================
CREATE TABLE working_hours (
  iso_weekday  smallint PRIMARY KEY CHECK (iso_weekday BETWEEN 1 AND 7),  -- 1 = poniedziałek, 7 = niedziela
  opens_at     time,
  closes_at    time,
  CHECK ((opens_at IS NULL) = (closes_at IS NULL)),     -- oba NULL = nieczynne
  CHECK (opens_at IS NULL OR closes_at > opens_at)
);

CREATE TABLE days_off (
  day         date PRIMARY KEY,
  reason      text,                        -- np. 'Boże Narodzenie', 'urlop'
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
--  BOOKINGS — wizyty
-- =====================================================================
CREATE TABLE bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 6)),  -- kod do linku w SMS
  client_id         uuid NOT NULL REFERENCES clients (id),
  treatment_id      text NOT NULL REFERENCES treatments (id) ON UPDATE CASCADE,
  starts_at         timestamptz NOT NULL,
  ends_at           timestamptz NOT NULL,
  status            booking_status NOT NULL DEFAULT 'confirmed',
  booked_via        text NOT NULL CHECK (booked_via IN ('account', 'guest', 'salon')),
  price             numeric(8,2) NOT NULL CHECK (price >= 0),      -- cena regularna w chwili rezerwacji
  promotion_id      text REFERENCES promotions (id),
  discount_percent  numeric(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 50),
  lowest_price_30d  numeric(8,2),                                   -- pokazana klientce przy obniżce
  total             numeric(8,2) GENERATED ALWAYS AS (round(price * (1 - discount_percent / 100), 2)) STORED,
  client_notes      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  cancelled_at      timestamptz,
  cancelled_by      text CHECK (cancelled_by IN ('client', 'salon')),
  CHECK (ends_at > starts_at),
  CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
  CHECK ((promotion_id IS NULL) = (discount_percent = 0)),
  -- Jedna osoba w gabinecie: aktywne wizyty nie mogą na siebie nachodzić
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (tstzrange(starts_at, ends_at, '[)') WITH &&)
    WHERE (status IN ('confirmed', 'completed'))
);
CREATE INDEX bookings_client_idx ON bookings (client_id, starts_at DESC);
CREATE INDEX bookings_starts_idx ON bookings (starts_at) WHERE status = 'confirmed';
-- Zniżka powitalna: tylko raz na klientkę (odwołana wizyta jej nie zużywa)
CREATE UNIQUE INDEX one_welcome_discount_per_client ON bookings (client_id)
  WHERE promotion_id = 'powitalna' AND status <> 'cancelled';

-- =====================================================================
--  SMS_LOG — potwierdzenia, przypomnienia, odwołania i kampanie
-- =====================================================================
CREATE TABLE sms_log (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id            uuid REFERENCES clients (id) ON DELETE SET NULL,
  booking_id           uuid REFERENCES bookings (id) ON DELETE SET NULL,
  type                 sms_type NOT NULL,
  campaign_name        text,
  phone                text NOT NULL,
  body                 text NOT NULL,
  status               sms_status NOT NULL DEFAULT 'queued',
  provider_message_id  text,
  error                text,
  scheduled_for        timestamptz NOT NULL DEFAULT now(),
  sent_at              timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CHECK ((type = 'campaign') = (campaign_name IS NOT NULL))
);
CREATE INDEX sms_log_queue_idx ON sms_log (scheduled_for) WHERE status = 'queued';
-- Jedno przypomnienie na wizytę
CREATE UNIQUE INDEX one_reminder_per_booking ON sms_log (booking_id) WHERE type = 'reminder';

-- =====================================================================
--  FUNKCJE
-- =====================================================================

-- Wolne terminy w danym dniu dla zabiegu o podanej długości (czas lokalny gabinetu)
CREATE FUNCTION available_slots(p_day date, p_duration_min int, p_step_min int DEFAULT 30)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE AS $$
  WITH hours AS (
    SELECT (p_day + wh.opens_at)  AT TIME ZONE 'Europe/Warsaw' AS day_open,
           (p_day + wh.closes_at) AT TIME ZONE 'Europe/Warsaw' AS day_close
      FROM working_hours wh
     WHERE wh.iso_weekday = extract(isodow FROM p_day)
       AND wh.opens_at IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM days_off d WHERE d.day = p_day)
  ), candidates AS (
    SELECT s AS slot_start, s + make_interval(mins => p_duration_min) AS slot_end
      FROM hours,
           generate_series(hours.day_open, hours.day_close - make_interval(mins => p_duration_min),
                           make_interval(mins => p_step_min)) AS s
  )
  SELECT c.slot_start, c.slot_end
    FROM candidates c
   WHERE c.slot_start > now()
     AND NOT EXISTS (
       SELECT 1 FROM bookings b
        WHERE b.status IN ('confirmed', 'completed')
          AND tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(c.slot_start, c.slot_end, '[)')
     )
   ORDER BY c.slot_start;
$$;

-- Usunięcie konta na życzenie klientki (RODO): anonimizacja zamiast kasowania,
-- żeby wizyty zostały w dokumentacji księgowej gabinetu.
CREATE FUNCTION anonymize_client(p_client uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE consents SET granted = false, source = 'anonymization', updated_at = now()
   WHERE client_id = p_client AND type IN ('marketing_sms', 'marketing_email') AND granted;
  UPDATE clients
     SET first_name = 'Usunięte', last_name = 'konto',
         email = 'usuniete+' || id || '@invalid.local', phone = '000000000',
         birth_month = NULL, has_account = false, auth_user_id = NULL, password_hash = NULL,
         salon_notes = NULL, deleted_at = now()
   WHERE id = p_client;
  UPDATE bookings SET client_notes = NULL WHERE client_id = p_client;
END $$;

-- =====================================================================
--  WIDOKI dla panelu gabinetu i zadań automatycznych
-- =====================================================================

-- Nadchodzące wizyty
CREATE VIEW v_upcoming_bookings AS
SELECT b.id, b.code, b.starts_at, b.ends_at, t.name AS treatment,
       c.first_name || ' ' || c.last_name AS client, c.phone, c.has_account,
       b.booked_via, b.price, b.discount_percent, b.total, b.client_notes
  FROM bookings b
  JOIN clients c    ON c.id = b.client_id
  JOIN treatments t ON t.id = b.treatment_id
 WHERE b.status = 'confirmed' AND b.starts_at >= now()
 ORDER BY b.starts_at;

-- Baza klientek z liczbą wizyt i zgodami
CREATE VIEW v_clients_overview AS
SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.has_account, c.created_at,
       v.visits, v.last_visit,
       coalesce((SELECT granted FROM consents WHERE client_id = c.id AND type = 'marketing_sms'), false)   AS marketing_sms,
       coalesce((SELECT granted FROM consents WHERE client_id = c.id AND type = 'marketing_email'), false) AS marketing_email
  FROM clients c
  LEFT JOIN LATERAL (
    SELECT count(*) AS visits, max(b.starts_at) AS last_visit
      FROM bookings b
     WHERE b.client_id = c.id AND b.status IN ('confirmed', 'completed')
  ) v ON true
 WHERE c.deleted_at IS NULL;

-- Odbiorczynie kampanii SMS: tylko z aktualną zgodą
CREATE VIEW v_sms_campaign_recipients AS
SELECT c.id, c.first_name, c.phone
  FROM clients c
  JOIN consents cs ON cs.client_id = c.id AND cs.type = 'marketing_sms' AND cs.granted
 WHERE c.deleted_at IS NULL;

-- Wizyty, do których trzeba wysłać przypomnienie (uruchamiane np. co 15 minut)
CREATE VIEW v_reminders_due AS
SELECT b.id AS booking_id, b.client_id, c.phone, b.starts_at, b.code, t.name AS treatment
  FROM bookings b
  JOIN clients c    ON c.id = b.client_id
  JOIN treatments t ON t.id = b.treatment_id
 WHERE b.status = 'confirmed'
   AND b.starts_at BETWEEN now() + interval '23 hours' AND now() + interval '25 hours'
   AND NOT EXISTS (SELECT 1 FROM sms_log s WHERE s.booking_id = b.id AND s.type = 'reminder');
