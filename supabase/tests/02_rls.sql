-- What each caller can actually see and do.
--
-- Run as the anon / authenticated roles with a JWT set, which is how Supabase
-- evaluates a real request. Reviewing policies by eye is how a table ends up
-- readable by the whole internet; this asserts it instead.

\set ON_ERROR_STOP on
\echo '== rls =='

begin;

-- Owner-level setup: RLS does not apply to the table owner.
insert into public.organizations (id, name, slug)
values ('11111111-1111-1111-1111-111111111111', 'اختبار', 'test');

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'operator@test'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'customer@test'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'stranger@test');

insert into public.resources (id, org_id, name)
values ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111', 'غرفة ١');

insert into public.services (id, org_id, name, duration_min, buffer_min, price_minor, is_active)
values ('33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111', 'استشارة', 30, 10, 15000, true),
       ('33333333-3333-3333-3333-333333333334',
        '11111111-1111-1111-1111-111111111111', 'خدمة معطّلة', 30, 0, 5000, false);

insert into public.service_resources values
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222');

insert into public.business_hours (org_id, weekday, open_time, close_time)
select '11111111-1111-1111-1111-111111111111', d, '09:00', '22:00'
from generate_series(0, 6) d;

insert into public.customers (id, org_id, user_id, name, phone) values
  ('44444444-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-0000-0000-0000-000000000002', 'ريم الدوسري', '0501234567'),
  ('44444444-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111', null, 'بدر الشمري', '0559876543');

insert into public.bookings (id, org_id, reference, customer_id, service_id, resource_id,
                             start_at, end_at, status, price_minor)
values ('66666666-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111', 'BK-2030-0001',
        '44444444-0000-0000-0000-000000000001',
        '33333333-3333-3333-3333-333333333333',
        '22222222-2222-2222-2222-222222222222',
        '2030-06-04 10:00+03', '2030-06-04 10:40+03', 'confirmed', 15000),
       ('66666666-0000-0000-0000-000000000002',
        '11111111-1111-1111-1111-111111111111', 'BK-2030-0002',
        '44444444-0000-0000-0000-000000000002',
        '33333333-3333-3333-3333-333333333333',
        '22222222-2222-2222-2222-222222222222',
        '2030-06-04 12:00+03', '2030-06-04 12:40+03', 'confirmed', 15000);

grant select, insert, update on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

create or replace function pg_temp.expect(label text, got bigint, want bigint)
returns void language plpgsql as $$
begin
  if got is distinct from want then
    raise exception 'FAIL %: expected %, got %', label, want, got;
  end if;
  raise notice '  PASS %', label;
end $$;

-- ---------------------------------------------------------------- anonymous
set local role anon;
select set_config('request.jwt.claims', '{}', true);

select pg_temp.expect('anon cannot read customers',
  (select count(*) from public.customers), 0);

select pg_temp.expect('anon cannot read bookings',
  (select count(*) from public.bookings), 0);

select pg_temp.expect('anon can read active services',
  (select count(*) from public.services), 1);

select pg_temp.expect('anon can read opening hours',
  (select count(*) from public.business_hours), 7);

do $$ begin
  insert into public.bookings (org_id, reference, customer_id, service_id, resource_id,
                               start_at, end_at, price_minor)
  values ('11111111-1111-1111-1111-111111111111', 'HACK-1',
          '44444444-0000-0000-0000-000000000001',
          '33333333-3333-3333-3333-333333333333',
          '22222222-2222-2222-2222-222222222222',
          '2030-06-05 10:00+03', '2030-06-05 10:40+03', 0);
  raise exception 'FAIL: anon inserted a booking directly';
exception when insufficient_privilege then
  raise notice '  PASS anon cannot insert a booking directly';
end $$;

-- ...but the guest booking path works, and prices it itself.
reset role;
do $$
declare v_ref text; v_price int;
begin
  select reference into v_ref
  from public.book_public(
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    '2030-06-06 10:00+03', 'منيرة العنزي', '0533334444');

  select price_minor into v_price from public.bookings where reference = v_ref;
  if v_price <> 15000 then
    raise exception 'FAIL: book_public did not take the price from the service (got %)', v_price;
  end if;
  raise notice '  PASS book_public creates a booking priced from the service';
end $$;

do $$ begin
  perform public.book_public(
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333334',   -- the inactive service
    '22222222-2222-2222-2222-222222222222',
    '2030-06-07 10:00+03', 'منيرة العنزي', '0533334444');
  raise exception 'FAIL: booked an inactive service';
exception when sqlstate '22023' then
  raise notice '  PASS book_public refuses an inactive service';
end $$;

do $$ begin
  perform public.book_public(
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    '2030-06-08 23:30+03', 'منيرة العنزي', '0533334444');
  raise exception 'FAIL: booked outside business hours';
exception when sqlstate '22023' then
  raise notice '  PASS book_public refuses a time outside opening hours';
end $$;

-- Reference lookup needs both factors.
do $$
declare n int;
begin
  select count(*) into n
  from public.get_booking_by_reference('BK-2030-0001', '4567');
  if n <> 1 then raise exception 'FAIL: correct reference + phone returned % rows', n; end if;

  select count(*) into n
  from public.get_booking_by_reference('BK-2030-0001', '0000');
  if n <> 0 then raise exception 'FAIL: wrong phone still returned the booking'; end if;

  raise notice '  PASS reference lookup requires the matching phone';
end $$;

-- ------------------------------------------------------------- the customer
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","app_metadata":{"role":"customer","org_id":"11111111-1111-1111-1111-111111111111"}}',
  true);

select pg_temp.expect('customer sees only their own bookings',
  (select count(*) from public.bookings), 1);

select pg_temp.expect('customer sees only their own record',
  (select count(*) from public.customers), 1);

-- The row is visible to them (bookings_cancel_own USING passes), so Postgres
-- gets as far as WITH CHECK and raises rather than quietly updating nothing.
-- An error here is the better failure: the client learns it was refused.
do $$ begin
  update public.bookings set payment_status = 'paid'
  where id = '66666666-0000-0000-0000-000000000001';
  raise exception 'FAIL: customer marked their own booking paid';
exception when insufficient_privilege then
  raise notice '  PASS customer cannot mark a booking paid';
end $$;

do $$
declare n int;
begin
  update public.bookings set status = 'cancelled'
  where id = '66666666-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: customer could not cancel their own booking'; end if;
  raise notice '  PASS customer can cancel their own booking';
end $$;

-- --------------------------------------------------------------- a stranger
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","app_metadata":{"role":"customer","org_id":"11111111-1111-1111-1111-111111111111"}}',
  true);

select pg_temp.expect('a signed-in stranger sees no bookings',
  (select count(*) from public.bookings), 0);

-- ------------------------------------------------------------- the operator
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","app_metadata":{"role":"operator","org_id":"11111111-1111-1111-1111-111111111111"}}',
  true);

select pg_temp.expect('operator sees every booking in the org',
  (select count(*) from public.bookings), 3);

select pg_temp.expect('operator sees every customer',
  (select count(*) from public.customers), 3);

select pg_temp.expect('operator sees inactive services too',
  (select count(*) from public.services), 2);

do $$
declare n int;
begin
  update public.bookings set payment_status = 'paid'
  where id = '66666666-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: operator could not record a payment'; end if;
  raise notice '  PASS operator can record a payment';
end $$;

reset role;
rollback;
\echo '== rls: all passed =='
