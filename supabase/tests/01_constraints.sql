-- What the exclusion constraint actually guarantees.
--
-- These run as the table owner, so RLS is not in play: the point here is that
-- the *constraint* holds even for a caller who bypasses every policy. If the
-- most privileged path cannot double-book, no path can.

\set ON_ERROR_STOP on
\echo '== constraints =='

begin;

insert into public.organizations (id, name, slug)
values ('11111111-1111-1111-1111-111111111111', 'اختبار', 'test');

insert into public.resources (id, org_id, name)
values ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111', 'غرفة ١');

insert into public.services (id, org_id, name, duration_min, buffer_min, price_minor)
values ('33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111', 'استشارة', 30, 10, 15000);

insert into public.service_resources values
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222');

insert into public.business_hours (org_id, weekday, open_time, close_time)
select '11111111-1111-1111-1111-111111111111', d, '09:00', '18:00'
from generate_series(0, 6) d;

insert into public.customers (id, org_id, name, phone)
values ('44444444-4444-4444-4444-444444444444',
        '11111111-1111-1111-1111-111111111111', 'ريم الدوسري', '0501234567');

create or replace function pg_temp.book(
  ref text, start_at timestamptz, minutes int, st public.booking_status
) returns void language sql as $$
  insert into public.bookings (org_id, reference, customer_id, service_id, resource_id,
                               start_at, end_at, status, price_minor)
  values ('11111111-1111-1111-1111-111111111111', ref,
          '44444444-4444-4444-4444-444444444444',
          '33333333-3333-3333-3333-333333333333',
          '22222222-2222-2222-2222-222222222222',
          start_at, start_at + make_interval(mins => minutes), st, 15000);
$$;

-- 1. A confirmed booking occupies its slot.
select pg_temp.book('T-1', '2030-03-04 10:00+03', 40, 'confirmed');
\echo '  [1] baseline booking inserted'

-- 2. An overlapping confirmed booking must be refused.
do $$ begin
  perform pg_temp.book('T-2', '2030-03-04 10:20+03', 40, 'confirmed');
  raise exception 'FAIL: overlapping booking was accepted';
exception when exclusion_violation then
  raise notice '  [2] PASS overlap rejected (23P01)';
end $$;

-- 3. Touching edges do not collide — matches overlaps() using '[)'.
select pg_temp.book('T-3', '2030-03-04 10:40+03', 40, 'confirmed');
\echo '  [3] PASS back-to-back booking accepted (half-open range)'

-- 4. Cancelled releases the time, matching BLOCKING in availability.ts.
select pg_temp.book('T-4', '2030-03-04 10:00+03', 40, 'cancelled');
\echo '  [4] PASS cancelled booking may overlap'

-- 5. So does no-show.
select pg_temp.book('T-5', '2030-03-04 10:05+03', 40, 'no_show');
\echo '  [5] PASS no-show booking may overlap'

-- 6. A different resource at the same time is fine.
insert into public.resources (id, org_id, name)
values ('55555555-5555-5555-5555-555555555555',
        '11111111-1111-1111-1111-111111111111', 'غرفة ٢');
insert into public.bookings (org_id, reference, customer_id, service_id, resource_id,
                             start_at, end_at, status, price_minor)
values ('11111111-1111-1111-1111-111111111111', 'T-6',
        '44444444-4444-4444-4444-444444444444',
        '33333333-3333-3333-3333-333333333333',
        '55555555-5555-5555-5555-555555555555',
        '2030-03-04 10:00+03', '2030-03-04 10:40+03', 'confirmed', 15000);
\echo '  [6] PASS same time on another resource accepted'

-- 7. Rescheduling onto a taken slot is refused too — this is the hole the
--    client-side check alone used to leave open. T-3 sits at 10:40 on the
--    same resource as T-1; moving it back onto T-1 must fail.
do $$ begin
  update public.bookings set start_at = '2030-03-04 10:20+03',
                             end_at   = '2030-03-04 11:00+03'
  where reference = 'T-3';
  raise exception 'FAIL: reschedule into a taken slot was accepted';
exception when exclusion_violation then
  raise notice '  [7] PASS reschedule into a taken slot rejected';
end $$;

-- 8. The audit trail is written by the trigger, not the caller.
do $$
declare n int;
begin
  select count(*) into n from public.booking_events
  where booking_id = (select id from public.bookings where reference = 'T-1');
  if n < 1 then raise exception 'FAIL: no event recorded on insert'; end if;
  raise notice '  [8] PASS insert recorded % audit event(s)', n;
end $$;

-- 9. Status changes append to it.
update public.bookings set status = 'completed' where reference = 'T-1';
do $$
declare n int;
begin
  select count(*) into n from public.booking_events
  where booking_id = (select id from public.bookings where reference = 'T-1')
    and type = 'completed';
  if n <> 1 then raise exception 'FAIL: completion not recorded (got %)', n; end if;
  raise notice '  [9] PASS status change recorded';
end $$;

-- 10. Opening hours are enforced in the org's own timezone.
do $$ begin
  if public.is_within_business_hours(
       '11111111-1111-1111-1111-111111111111',
       '2030-03-04 10:00+03', '2030-03-04 10:40+03') is not true then
    raise exception 'FAIL: a 10:00 booking was called out of hours';
  end if;
  if public.is_within_business_hours(
       '11111111-1111-1111-1111-111111111111',
       '2030-03-04 20:00+03', '2030-03-04 20:40+03') is not false then
    raise exception 'FAIL: a 20:00 booking was called in hours';
  end if;
  raise notice ' [10] PASS business hours honoured';
end $$;

rollback;
\echo '== constraints: all passed =='
