-- Functions and triggers.

-- ---------------------------------------------------------------------------
-- Auth helpers.
--
-- These read the JWT and never touch a table. RLS policies are evaluated per
-- row, so a policy that does a lookup turns every query into a join against
-- profiles. The role also lives in profiles, but as a mirror for display —
-- the claim is what authorises.
-- ---------------------------------------------------------------------------
create or replace function public.auth_role() returns public.app_role
language sql stable as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    'customer'
  )::public.app_role
$$;

create or replace function public.auth_org() returns uuid
language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')::uuid
$$;

create or replace function public.is_operator() returns boolean
language sql stable as $$
  select public.auth_role() = 'operator'
$$;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger bookings_touch_updated_at
  before update on public.bookings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Audit trail.
--
-- appendEvent() lives in the store today, which means the history is only as
-- honest as the client writing it. Moving it here makes it a fact about what
-- happened to the row rather than a claim the caller supplied.
-- ---------------------------------------------------------------------------
-- security definer is load-bearing, not decoration. A trigger function runs
-- as the *invoking* user by default, so without this a customer cancelling
-- their own booking is refused at the audit insert — booking_events has no
-- insert policy, and deliberately should not have one.
create or replace function public.emit_booking_event() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_type public.booking_event_type;
  summary    text;
begin
  if tg_op = 'INSERT' then
    insert into public.booking_events (booking_id, type, summary, actor_id)
    values (new.id, 'created', 'أُنشئ الحجز', auth.uid());
    return new;
  end if;

  if new.status is distinct from old.status then
    event_type := case new.status
      when 'confirmed' then 'confirmed'
      when 'completed' then 'completed'
      when 'cancelled' then 'cancelled'
      when 'no_show'   then 'no_show'
      else 'note_added'
    end;
    summary := case new.status
      when 'pending'   then 'أُعيد الحجز إلى الانتظار'
      when 'confirmed' then 'تم تأكيد الحجز'
      when 'completed' then 'اكتملت الخدمة'
      when 'cancelled' then 'أُلغي الحجز'
      when 'no_show'   then 'لم يحضر العميل'
    end;
    insert into public.booking_events (booking_id, type, summary, actor_id)
    values (new.id, event_type, summary, auth.uid());
  end if;

  if new.payment_status is distinct from old.payment_status then
    insert into public.booking_events (booking_id, type, summary, actor_id)
    values (new.id, 'payment_recorded', case new.payment_status
      when 'unpaid'       then 'أُلغي تسجيل الدفع'
      when 'deposit_paid' then 'سُجّل عربون'
      when 'paid'         then 'سُجّل الدفع كاملاً'
      when 'refunded'     then 'تمت إعادة المبلغ'
    end, auth.uid());
  end if;

  if new.start_at is distinct from old.start_at then
    insert into public.booking_events (booking_id, type, summary, actor_id)
    values (new.id, 'rescheduled', 'أُعيدت جدولة الحجز', auth.uid());
  end if;

  return new;
end
$$;

create trigger bookings_emit_event_insert
  after insert on public.bookings
  for each row execute function public.emit_booking_event();

create trigger bookings_emit_event_update
  after update on public.bookings
  for each row execute function public.emit_booking_event();

-- ---------------------------------------------------------------------------
-- Opening hours.
--
-- A CHECK constraint cannot consult another table, so this is a function the
-- booking paths call. It is the same rule isOpenOn()/generateSlots() apply on
-- the client, enforced where the client cannot be trusted.
-- ---------------------------------------------------------------------------
create or replace function public.is_within_business_hours(
  p_org uuid, p_start timestamptz, p_end timestamptz
) returns boolean
language plpgsql stable as $$
declare
  tz   text;
  hours public.business_hours%rowtype;
  local_start timestamp;
  local_end   timestamp;
begin
  select timezone into tz from public.organizations where id = p_org;
  if tz is null then return false; end if;

  -- Weekday and wall-clock time are only meaningful in the org's own zone.
  local_start := p_start at time zone tz;
  local_end   := p_end   at time zone tz;

  -- A booking that crosses midnight cannot sit inside one day's hours.
  if local_start::date <> local_end::date then return false; end if;

  select * into hours
  from public.business_hours
  where org_id = p_org and weekday = extract(dow from local_start)::smallint;

  if not found or hours.is_closed then return false; end if;

  return local_start::time >= hours.open_time
     and local_end::time   <= hours.close_time;
end
$$;

-- Reference numbers, matching bookingReference() in src/lib/id.ts.
create sequence if not exists public.booking_reference_seq start 500;

create or replace function public.next_booking_reference() returns text
language sql volatile as $$
  select 'BK-' || to_char(now(), 'YYYY') || '-'
       || lpad(nextval('public.booking_reference_seq')::text, 4, '0')
$$;
