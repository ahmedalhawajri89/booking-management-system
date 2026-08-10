-- Minimal stand-ins for what Supabase provides, so the migrations can be run
-- and tested against a plain Postgres container.
--
-- This file is never applied to a real Supabase project: `auth` and the anon /
-- authenticated roles already exist there. It exists so the schema, the
-- exclusion constraint and the RLS policies can be exercised for real in CI
-- rather than reviewed by eye.

create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text
);

do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;

do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;

do $$ begin
  create role service_role nologin bypassrls;
exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated, service_role;

-- Supabase derives these from the request JWT. Here they read a session
-- setting the tests set directly, which is exactly what Supabase does under
-- the hood (request.jwt.claims).
create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  )
$$;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', 'anon')
$$;

-- Supabase grants these by default. Without them a policy that calls
-- auth.uid() fails with "permission denied for schema auth" rather than
-- returning false, which looks like a policy bug and is not one.
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.jwt(), auth.uid(), auth.role()
  to anon, authenticated, service_role;
