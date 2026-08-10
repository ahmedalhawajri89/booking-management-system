-- Extensions and enums.
--
-- btree_gist is not optional: the no-double-booking constraint in 0003 needs
-- it to combine an equality test on resource_id with an overlap test on a
-- range in the same exclusion constraint.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;
create extension if not exists pg_trgm;

-- These mirror the unions in src/types/index.ts exactly. They are the machine
-- values; Arabic labels stay in the UI layer, as they do on the client.
create type public.booking_status as enum (
  'pending', 'confirmed', 'completed', 'cancelled', 'no_show'
);

create type public.payment_status as enum (
  'unpaid', 'deposit_paid', 'paid', 'refunded'
);

create type public.booking_channel as enum ('online', 'phone', 'walk_in');

create type public.booking_event_type as enum (
  'created', 'confirmed', 'rescheduled', 'cancelled',
  'completed', 'no_show', 'payment_recorded', 'note_added'
);

create type public.app_role as enum ('operator', 'customer');
