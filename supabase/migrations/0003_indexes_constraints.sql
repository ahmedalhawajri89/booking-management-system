-- Indexes and the constraint this whole migration exists for.

-- ---------------------------------------------------------------------------
-- No double-booking. Ever.
--
-- src/stores/bookings.ts checks hasConflict() before writing, and the slot
-- grid never offers a taken time. Both are good UX and neither is a guarantee:
-- they cannot stop two operators confirming the same slot in the same second,
-- and they cannot stop a direct write.
--
-- WHERE mirrors BLOCKING in src/lib/availability.ts — cancelled and no-show
-- release their time — and `span` is the same half-open range the client
-- compares. Any path that tries to overlap now fails with SQLSTATE 23P01,
-- which the repository translates into a typed ConflictError.
-- ---------------------------------------------------------------------------
alter table public.bookings
  add constraint bookings_no_double_booking
  exclude using gist (resource_id with =, span with &&)
  where (status in ('pending', 'confirmed'));

-- Day and week views, and every range query on the analytics screen.
create index bookings_org_start_idx on public.bookings (org_id, start_at);

-- The customer drawer and the byCustomer index the store builds.
create index bookings_customer_idx on public.bookings (customer_id, start_at desc);

-- Partial: the "needs attention" list only ever looks at live bookings, and
-- completed/cancelled rows accumulate forever.
create index bookings_open_idx on public.bookings (org_id, status)
  where status in ('pending', 'confirmed');

create index booking_events_booking_idx on public.booking_events (booking_id, at);

-- Name search in the customers screen. trigram, because the client searches
-- substrings and Arabic names are not prefix-friendly.
create index customers_name_trgm_idx on public.customers using gin (name gin_trgm_ops);
create index customers_org_idx on public.customers (org_id);

create index services_org_idx  on public.services  (org_id) where is_active;
create index resources_org_idx on public.resources (org_id) where is_active;
