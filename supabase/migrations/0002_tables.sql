-- Tables.
--
-- Money is in minor units and durations are whole minutes, matching the
-- conventions documented at the top of src/types/index.ts. Instants are
-- timestamptz; the client already speaks ISO 8601 everywhere.

create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null,
  slug       text        not null unique,
  timezone   text        not null default 'Asia/Riyadh',
  currency   char(3)     not null default 'SAR',
  created_at timestamptz not null default now()
);

-- One tenant today. org_id is on every table anyway: adding it now costs a
-- column, adding it later costs a migration on live booking data.
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  org_id     uuid        not null references public.organizations on delete cascade,
  full_name  text        not null default '',
  phone      text,
  -- Mirrors app_metadata.role. The JWT is the authority (see 0005) because
  -- reading a claim is free and reading a row is not, per policy evaluation.
  role       public.app_role not null default 'customer',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.resources (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid    not null references public.organizations on delete cascade,
  name       text    not null,
  is_active  boolean not null default true,
  sort_order int     not null default 0,
  created_at timestamptz not null default now()
);

create table public.services (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid    not null references public.organizations on delete cascade,
  name         text    not null,
  description  text    not null default '',
  duration_min int     not null check (duration_min > 0),
  buffer_min   int     not null default 0 check (buffer_min >= 0),
  price_minor  int     not null default 0 check (price_minor >= 0),
  -- The client resolves this to a component through src/lib/icons.ts. A Vue
  -- component cannot be stored, which is why the key travels instead.
  icon_key     text    not null default 'Sparkles',
  is_active    boolean not null default true,
  sort_order   int     not null default 0,
  created_at   timestamptz not null default now()
);

-- Service.resourceIds, normalised.
create table public.service_resources (
  service_id  uuid not null references public.services  on delete cascade,
  resource_id uuid not null references public.resources on delete cascade,
  primary key (service_id, resource_id)
);

create table public.business_hours (
  org_id     uuid     not null references public.organizations on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  open_time  time     not null default '09:00',
  close_time time     not null default '18:00',
  is_closed  boolean  not null default false,
  primary key (org_id, weekday),
  -- The client refuses this in SettingsView; the database refuses it for
  -- every other path. An inverted day makes slot generation return nothing
  -- and say nothing about why.
  constraint business_hours_ordered check (is_closed or close_time > open_time)
);

create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations on delete cascade,
  -- Set when a customer signs up and claims their record; null for the many
  -- who only ever book as guests.
  user_id    uuid references auth.users on delete set null,
  name       text not null,
  phone      text not null,
  -- Puts normalisePhone() from src/stores/customers.ts in the database, so
  -- dedupe holds regardless of which client wrote the row.
  phone_digits text generated always as (regexp_replace(phone, '\D', '', 'g')) stored,
  email      text,
  notes      text,
  created_at timestamptz not null default now(),
  unique (org_id, phone_digits)
);

create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations on delete cascade,
  reference      text not null unique,
  customer_id    uuid not null references public.customers on delete restrict,
  service_id     uuid not null references public.services  on delete restrict,
  resource_id    uuid not null references public.resources on delete restrict,
  start_at       timestamptz not null,
  end_at         timestamptz not null,
  status         public.booking_status  not null default 'pending',
  payment_status public.payment_status  not null default 'unpaid',
  -- Snapshot at booking time. Services change price; a booking must not.
  price_minor    int  not null check (price_minor >= 0),
  channel        public.booking_channel not null default 'online',
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- '[)' matches overlaps() in src/lib/availability.ts exactly: touching
  -- edges do not collide. The exclusion constraint in 0003 is built on this,
  -- so the two definitions of "overlap" cannot drift apart.
  span tstzrange generated always as (tstzrange(start_at, end_at, '[)')) stored,
  constraint bookings_ordered check (end_at > start_at)
);

-- A separate table rather than a JSONB column: the audit trail is queryable,
-- append-only, and written by a trigger, so a client cannot forge it.
create table public.booking_events (
  id         bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings on delete cascade,
  at         timestamptz not null default now(),
  type       public.booking_event_type not null,
  summary    text not null,
  actor_id   uuid references auth.users on delete set null
);
