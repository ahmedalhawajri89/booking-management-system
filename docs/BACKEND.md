# Backend

The app runs against one of two backends, chosen by a single environment
variable.

| | `VITE_SUPABASE_URL` unset | set |
|---|---|---|
| Storage | `localStorage` | Postgres via Supabase |
| Auth | a session that verifies nothing | Supabase Auth |
| Seed data | regenerated each day, anchored to today | `supabase/seed.sql`, run once |
| Reset button in Settings | shown | hidden |

The demo path exists so the app is usable with no setup at all, and so
development works offline. It is not a stub: it enforces the same
no-double-booking rule the database does, because two backends that disagree
about what is legal produce bugs that only appear in production.

---

## Running against Supabase

```bash
cp .env.example .env.local     # fill in URL, anon key, org id
supabase db push               # or run supabase/migrations/*.sql in order
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
npm run dev
```

Then grant yourself operator access. The role lives in `app_metadata`, which
only the service role can write — that is the point. From the SQL editor:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data
  || jsonb_build_object(
       'role', 'operator',
       'org_id', '00000000-0000-4000-8000-000000000001'
     )
where email = 'you@example.com';
```

Sign out and in again to pick up the new claim.

### Why not `user_metadata`

Because the user can write it. A role stored there is a role anyone can grant
themselves, and every policy in `0005_rls.sql` keys off
`auth.jwt() -> 'app_metadata' ->> 'role'`.

---

## Environment variables

| Variable | Where | Public? |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local`, CI | Yes — it is a URL |
| `VITE_SUPABASE_ANON_KEY` | `.env.local`, CI | **Yes, by design.** RLS is the guard |
| `VITE_SUPABASE_ORG_ID` | `.env.local`, CI | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function secrets only | **Never** |

Anything prefixed `VITE_` is compiled into the bundle and served to every
visitor. The service role key bypasses RLS entirely; shipping it would make
every policy decoration. `npm run check:secrets` fails the build if it, or a
hard-coded JWT, appears under `src/` or `scripts/`.

---

## What the database guarantees

The client checks for conflicts before writing and the slot grid never offers
a taken time. Both are good, and neither is a guarantee — they cannot stop two
operators confirming the same slot in the same second, and they cannot stop a
direct write. This can:

```sql
exclude using gist (resource_id with =, span with &&)
  where (status in ('pending','confirmed'))
```

`span` is a generated `tstzrange` using `'[)'`, the same half-open comparison
`overlaps()` makes in `src/lib/availability.js`, and the `WHERE` mirrors its
`BLOCKING` set — so the two definitions of "overlap" cannot drift apart. A
violation surfaces as SQLSTATE `23P01`, which the repository turns into a
typed `ConflictError`.

Also enforced in the database, not just the UI:

- **Audit trail.** `booking_events` rows are written by a trigger, and no
  policy allows a client to insert one. An audit trail a caller can append to
  is not an audit trail.
- **Opening hours.** `is_within_business_hours()` evaluates in the
  organization's own timezone, so "10:00" means 10:00 to the operator.
- **Customer identity.** `phone_digits` is a generated column with a unique
  constraint, which puts `normalisePhone()` in the database and keeps dedupe
  correct regardless of which client wrote the row.

## What guests can do without an account

Two `security definer` functions, not table policies:

- **`book_public(...)`** — granting `anon` INSERT would let a caller choose
  their own price, end time and status. Everything that matters is computed
  from the service row instead.
- **`get_booking_by_reference(ref, phone_last4)`** — `BK-2026-0431` is
  sequential, so a policy keyed on the reference alone would expose every
  booking to anyone who can count. Two factors required.

---

## Testing

```bash
npm test          # pure logic: availability, analytics, CSV escaping
npm run db:test   # migrations + seed + SQL tests, in Docker
```

`db:test` starts a throwaway Postgres 16, applies every migration and the
seed, and runs `supabase/tests/*.sql`: 23 assertions covering the exclusion
constraint, the audit trigger, opening hours, and RLS evaluated as `anon`,
a customer, a stranger, and an operator with real JWT claims.

`supabase/tests/00_shim.sql` stands in for what Supabase itself provides — the
`auth` schema, `auth.uid()`, and the `anon`/`authenticated` roles — so all of
this runs against plain Postgres. It is never applied to a real project.

---

## Known limitations

- **`saveBookings` upserts the whole array.** That is fine for localStorage
  and wasteful against Postgres. Granular writes are the next step; the
  interface was kept identical for this pass so the backend swap could be
  verified on its own.
- **The public catalogue policies are not org-scoped**, and cannot be — an
  anonymous visitor carries no org claim, so callers pass `org_id` as a
  filter. On a single-tenant deployment that is equivalent. Serving several
  businesses would need a public `slug` lookup or a security-definer function;
  writes are already scoped.
- **No realtime yet.** Two operators on the same screen will not see each
  other's changes until reload. `subscribeBookings` on the repository
  interface is the intended shape.
