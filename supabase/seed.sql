-- Demo data for a fresh Supabase project.
--
-- Mirrors src/data/seed.ts: the same services, the same resources, and a day
-- that contains the awkward cases the operator screens are built to surface —
-- a pending booking due soon, an unpaid confirmed one, a no-show, a completed
-- appointment that is still open.
--
-- One case cannot be reproduced here, and that is the point of the schema:
-- the local seed plants a deliberate conflict so the "needs attention" list
-- has something to show. bookings_no_double_booking rejects it. What follows
-- instead is a pair of bookings with no turnaround gap between them — a real
-- problem an operator would want to see, and one the database allows.

begin;

insert into public.organizations (id, name, slug, timezone)
values ('00000000-0000-4000-8000-000000000001', 'حجوزات برو', 'bookingpro', 'Asia/Riyadh')
on conflict (slug) do nothing;

insert into public.resources (id, org_id, name, sort_order) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'غرفة ١', 0),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'غرفة ٢', 1)
on conflict (id) do nothing;

insert into public.services
  (id, org_id, name, description, duration_min, buffer_min, price_minor, icon_key, sort_order)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001',
   'استشارة طبية متخصصة', 'جلسة استشارية شاملة مع طبيب مختص لمناقشة حالتك.',
   30, 10, 15000, 'HeartPulse', 0),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000001',
   'قص شعر وتصفيف VIP', 'تصفيف وقص شعر بأحدث القصات مع عناية خاصة بالفروة.',
   45, 15, 8000, 'Scissors', 1),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000001',
   'حجز طاولة عشاء', 'حجز طاولة في القسم الهادئ مع إطلالة بانورامية.',
   120, 30, 20000, 'Coffee', 2)
on conflict (id) do nothing;

insert into public.service_resources values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000102'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000102')
on conflict do nothing;

insert into public.business_hours (org_id, weekday, open_time, close_time, is_closed) values
  ('00000000-0000-4000-8000-000000000001', 0, '09:00', '18:00', false),
  ('00000000-0000-4000-8000-000000000001', 1, '09:00', '18:00', false),
  ('00000000-0000-4000-8000-000000000001', 2, '09:00', '18:00', false),
  ('00000000-0000-4000-8000-000000000001', 3, '09:00', '18:00', false),
  ('00000000-0000-4000-8000-000000000001', 4, '09:00', '16:00', false),
  ('00000000-0000-4000-8000-000000000001', 5, '14:00', '20:00', false),
  ('00000000-0000-4000-8000-000000000001', 6, '10:00', '18:00', false)
on conflict (org_id, weekday) do nothing;

insert into public.customers (id, org_id, name, phone, email) values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000001',
   'أحمد سعيد', '0501234567', 'ahmed@example.com'),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000001',
   'سارة خالد', '0559876543', null),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000001',
   'نورة القحطاني', '0533334444', null),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000001',
   'خالد الحربي', '0565678901', null)
on conflict (org_id, phone_digits) do nothing;

-- Anchored to today so the day board is never empty, in the org's own zone
-- so 10:00 means 10:00 to the operator looking at it.
do $$
declare
  org  uuid := '00000000-0000-4000-8000-000000000001';
  svc1 uuid := '00000000-0000-4000-8000-000000000201';
  svc2 uuid := '00000000-0000-4000-8000-000000000202';
  r1   uuid := '00000000-0000-4000-8000-000000000101';
  today date := (now() at time zone 'Asia/Riyadh')::date;

  procedure_note text;
begin
  perform 1 from public.bookings where org_id = org limit 1;
  if found then
    raise notice 'bookings already present — seed skipped';
    return;
  end if;

  -- Completed, paid: the ordinary case.
  insert into public.bookings (org_id, reference, customer_id, service_id, resource_id,
                               start_at, end_at, status, payment_status, price_minor, channel)
  values (org, public.next_booking_reference(), '00000000-0000-4000-8000-000000000301',
          svc1, r1,
          (today + time '09:00') at time zone 'Asia/Riyadh',
          (today + time '09:40') at time zone 'Asia/Riyadh',
          'completed', 'paid', 15000, 'online');

  -- Confirmed but unpaid, and back-to-back with the next one: no turnaround
  -- gap. This is what replaces the local seed's impossible conflict.
  insert into public.bookings (org_id, reference, customer_id, service_id, resource_id,
                               start_at, end_at, status, payment_status, price_minor, channel)
  values (org, public.next_booking_reference(), '00000000-0000-4000-8000-000000000302',
          svc2, r1,
          (today + time '10:00') at time zone 'Asia/Riyadh',
          (today + time '11:00') at time zone 'Asia/Riyadh',
          'confirmed', 'unpaid', 8000, 'phone');

  insert into public.bookings (org_id, reference, customer_id, service_id, resource_id,
                               start_at, end_at, status, payment_status, price_minor, channel)
  values (org, public.next_booking_reference(), '00000000-0000-4000-8000-000000000304',
          svc1, r1,
          (today + time '11:00') at time zone 'Asia/Riyadh',
          (today + time '11:40') at time zone 'Asia/Riyadh',
          'confirmed', 'deposit_paid', 15000, 'walk_in');

  -- Pending and due soon: the top of the attention list.
  insert into public.bookings (org_id, reference, customer_id, service_id, resource_id,
                               start_at, end_at, status, payment_status, price_minor, channel)
  values (org, public.next_booking_reference(), '00000000-0000-4000-8000-000000000303',
          svc1, r1,
          (today + time '15:00') at time zone 'Asia/Riyadh',
          (today + time '15:40') at time zone 'Asia/Riyadh',
          'pending', 'unpaid', 15000, 'online');

  -- Yesterday's no-show, so the analytics screen has a rate to report.
  insert into public.bookings (org_id, reference, customer_id, service_id, resource_id,
                               start_at, end_at, status, payment_status, price_minor, channel)
  values (org, public.next_booking_reference(), '00000000-0000-4000-8000-000000000302',
          svc2, r1,
          (today - 1 + time '12:00') at time zone 'Asia/Riyadh',
          (today - 1 + time '13:00') at time zone 'Asia/Riyadh',
          'no_show', 'unpaid', 8000, 'online');

  procedure_note := 'seeded ' || (select count(*) from public.bookings where org_id = org) || ' bookings';
  raise notice '%', procedure_note;
end $$;

commit;
