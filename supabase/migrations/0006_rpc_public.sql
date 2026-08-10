-- The two things a visitor with no account can do.
--
-- Both are security definer functions rather than table policies, because the
-- guest paths need to write and read across tables that anon must not be able
-- to touch directly.

-- ---------------------------------------------------------------------------
-- Book without an account.
--
-- Granting anon INSERT on bookings would be the short version, and wrong: it
-- would let a caller choose their own price, end time and status, and it
-- exposes the table shape. Everything that matters is computed here from the
-- service row — the client is trusted for the service, the resource, the
-- start time and who they are, and for nothing else.
-- ---------------------------------------------------------------------------
create or replace function public.book_public(
  p_org      uuid,
  p_service  uuid,
  p_resource uuid,
  p_start    timestamptz,
  p_name     text,
  p_phone    text,
  p_email    text default null,
  p_notes    text default null
) returns table (id uuid, reference text)
language plpgsql
security definer
set search_path = public
as $$
declare
  svc      public.services%rowtype;
  v_end    timestamptz;
  v_customer uuid;
  v_ref    text;
  v_id     uuid;
begin
  if length(coalesce(trim(p_name), '')) < 2 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 9 then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;

  select * into svc
  from public.services
  where services.id = p_service and org_id = p_org and is_active;
  if not found then
    raise exception 'unknown_service' using errcode = '22023';
  end if;

  -- Duration, buffer and price come from the service, never from the caller.
  v_end := p_start + make_interval(mins => svc.duration_min + svc.buffer_min);

  if not exists (
    select 1 from public.service_resources
    where service_id = p_service and resource_id = p_resource
  ) then
    raise exception 'resource_not_offered' using errcode = '22023';
  end if;

  if p_start < now() then
    raise exception 'start_in_past' using errcode = '22023';
  end if;

  if not public.is_within_business_hours(p_org, p_start, v_end) then
    raise exception 'outside_business_hours' using errcode = '22023';
  end if;

  -- Same identity rule as the client: the phone is the key.
  insert into public.customers (org_id, name, phone, email)
  values (p_org, trim(p_name), p_phone, nullif(trim(coalesce(p_email, '')), ''))
  on conflict (org_id, phone_digits)
    do update set name = excluded.name,
                  email = coalesce(excluded.email, public.customers.email)
  returning public.customers.id into v_customer;

  v_ref := public.next_booking_reference();

  -- No conflict check here on purpose: bookings_no_double_booking is the
  -- authority, and letting it raise 23P01 closes the race that a check-then-
  -- insert would leave open.
  insert into public.bookings (
    org_id, reference, customer_id, service_id, resource_id,
    start_at, end_at, status, payment_status, price_minor, channel, notes
  ) values (
    p_org, v_ref, v_customer, p_service, p_resource,
    p_start, v_end, 'pending', 'unpaid', svc.price_minor, 'online',
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning public.bookings.id into v_id;

  return query select v_id, v_ref;
end
$$;

revoke all on function public.book_public from public;
grant execute on function public.book_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Look up a booking by its reference.
--
-- Not a SELECT policy: BK-2026-0431 is sequential and trivially guessable, so
-- a policy keyed on the reference alone would expose every booking to anyone
-- who can count. Two factors are required, and the function returns only the
-- fields the customer-facing page renders.
-- ---------------------------------------------------------------------------
create or replace function public.get_booking_by_reference(
  p_reference   text,
  p_phone_last4 text
) returns table (
  reference      text,
  start_at       timestamptz,
  end_at         timestamptz,
  status         public.booking_status,
  payment_status public.payment_status,
  price_minor    int,
  service_name   text,
  customer_name  text
)
language sql
security definer
set search_path = public
as $$
  select b.reference, b.start_at, b.end_at, b.status, b.payment_status,
         b.price_minor, s.name, c.name
  from public.bookings b
  join public.services  s on s.id = b.service_id
  join public.customers c on c.id = b.customer_id
  where upper(b.reference) = upper(trim(p_reference))
    and right(c.phone_digits, 4) = right(regexp_replace(p_phone_last4, '\D', '', 'g'), 4)
$$;

revoke all on function public.get_booking_by_reference from public;
grant execute on function public.get_booking_by_reference to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cancel your own booking from that same page.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_by_reference(
  p_reference   text,
  p_phone_last4 text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select b.id into v_id
  from public.bookings b
  join public.customers c on c.id = b.customer_id
  where upper(b.reference) = upper(trim(p_reference))
    and right(c.phone_digits, 4) = right(regexp_replace(p_phone_last4, '\D', '', 'g'), 4)
    and b.status in ('pending', 'confirmed');

  if v_id is null then return false; end if;

  update public.bookings set status = 'cancelled' where id = v_id;
  return true;
end
$$;

revoke all on function public.cancel_by_reference from public;
grant execute on function public.cancel_by_reference to anon, authenticated;
