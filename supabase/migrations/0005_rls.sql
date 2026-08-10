-- Row Level Security.
--
-- The anon key ships in the browser by design; it is public. RLS is the only
-- thing standing between it and the data, so every table gets it and nothing
-- is left to a client-side check.

alter table public.organizations  enable row level security;
alter table public.profiles       enable row level security;
alter table public.resources      enable row level security;
alter table public.services       enable row level security;
alter table public.service_resources enable row level security;
alter table public.business_hours enable row level security;
alter table public.customers      enable row level security;
alter table public.bookings       enable row level security;
alter table public.booking_events enable row level security;

-- ---------------------------------------------------------------------------
-- Organization
-- ---------------------------------------------------------------------------
create policy org_read on public.organizations
  for select using (id = public.auth_org());

create policy org_update on public.organizations
  for update using (id = public.auth_org() and public.is_operator());

-- ---------------------------------------------------------------------------
-- Profiles. A user may read and edit their own; operators may read the team.
-- Nobody may change their own role through this table — that is what makes
-- the JWT claim, set server-side, the authority.
-- ---------------------------------------------------------------------------
create policy profile_read on public.profiles
  for select using (id = auth.uid() or (public.is_operator() and org_id = public.auth_org()));

create policy profile_update_self on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Catalog: public to read.
--
-- The guest booking page has no session and still has to show services,
-- resources and opening hours. Only active rows are exposed — a service the
-- operator turned off should not be discoverable.
--
-- Note what this does NOT do: it is not scoped by organization, and cannot
-- be. An anonymous visitor carries no org claim, so there is nothing to scope
-- against; callers pass org_id as a filter instead. On a single-tenant
-- deployment that is exactly equivalent. If this ever serves several
-- businesses, the catalogue of one would be readable by anyone who knows
-- another's org id, and this policy needs a public `slug` lookup or a
-- security-definer function instead. Writes are already org-scoped.
-- ---------------------------------------------------------------------------
create policy services_public_read on public.services
  for select to anon, authenticated using (is_active);

create policy services_write on public.services
  for all to authenticated
  using (public.is_operator() and org_id = public.auth_org())
  with check (public.is_operator() and org_id = public.auth_org());

create policy resources_public_read on public.resources
  for select to anon, authenticated using (is_active);

create policy resources_write on public.resources
  for all to authenticated
  using (public.is_operator() and org_id = public.auth_org())
  with check (public.is_operator() and org_id = public.auth_org());

create policy service_resources_public_read on public.service_resources
  for select to anon, authenticated using (true);

create policy service_resources_write on public.service_resources
  for all to authenticated
  using (public.is_operator())
  with check (public.is_operator());

create policy hours_public_read on public.business_hours
  for select to anon, authenticated using (true);

create policy hours_write on public.business_hours
  for all to authenticated
  using (public.is_operator() and org_id = public.auth_org())
  with check (public.is_operator() and org_id = public.auth_org());

-- ---------------------------------------------------------------------------
-- Customers. Never readable by anon: the guest booking path writes through a
-- security-definer function (0006) instead, so the table stays closed.
-- ---------------------------------------------------------------------------
create policy customers_read on public.customers
  for select to authenticated using (
    (public.is_operator() and org_id = public.auth_org())
    or user_id = auth.uid()
  );

create policy customers_insert on public.customers
  for insert to authenticated
  with check (public.is_operator() and org_id = public.auth_org());

create policy customers_update on public.customers
  for update to authenticated using (
    (public.is_operator() and org_id = public.auth_org())
    or user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Bookings.
--
-- Customers see their own and may cancel them — nothing else. The WITH CHECK
-- pins exactly that: any customer-originated update must leave the row
-- cancelled, so "update my booking" cannot become "mark it paid".
--
-- There is no delete policy on purpose. Cancelling is a state, and the audit
-- trail has to survive it.
-- ---------------------------------------------------------------------------
create policy bookings_read on public.bookings
  for select to authenticated using (
    (public.is_operator() and org_id = public.auth_org())
    or customer_id in (select id from public.customers where user_id = auth.uid())
  );

create policy bookings_insert on public.bookings
  for insert to authenticated
  with check (public.is_operator() and org_id = public.auth_org());

create policy bookings_update_operator on public.bookings
  for update to authenticated
  using (public.is_operator() and org_id = public.auth_org())
  with check (public.is_operator() and org_id = public.auth_org());

create policy bookings_cancel_own on public.bookings
  for update to authenticated
  using (customer_id in (select id from public.customers where user_id = auth.uid()))
  with check (
    status = 'cancelled'
    and customer_id in (select id from public.customers where user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Booking events. Readable with the booking, and writable by nobody: the
-- only writer is emit_booking_event(), which is security definer for exactly
-- this reason. No insert or update policy exists here on purpose — an audit
-- trail a caller can append to is not an audit trail.
-- ---------------------------------------------------------------------------
create policy booking_events_read on public.booking_events
  for select to authenticated using (
    booking_id in (select id from public.bookings)
  );
