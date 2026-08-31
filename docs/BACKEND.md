# Backend

The app runs against one of two backends, chosen by a single environment
variable.

| | `VITE_API_URL` unset | set |
|---|---|---|
| Storage | `localStorage` | MySQL, through the Laravel API in `api/` |
| Auth | a session that verifies nothing | Laravel Sanctum bearer tokens |
| Seed data | regenerated each day, anchored to today | `php artisan db:seed`, run once |
| Reset button in Settings | shown | hidden |

The demo path exists so the app is usable with no setup at all, and so
development works offline. It is not a stub: it enforces the same
no-double-booking rule the API does, because two backends that disagree about
what is legal produce bugs that only appear in production.

It is also what keeps the public demo alive. The deployed site is a static
bundle on Vercel, which cannot host PHP or MySQL, so it runs the localStorage
path and is a complete working product rather than a broken shell.

---

## Running against MySQL

```bash
cd api
cp .env.example .env
php artisan key:generate
mysql -u root -e "create database booking_management character set utf8mb4 collate utf8mb4_unicode_ci"
php artisan migrate --seed
php artisan serve --port=8000
```

Then, from the project root:

```bash
echo "VITE_API_URL=http://localhost:8000/api" > .env.local
npm run dev
```

The seeder creates one operator — `operator@example.com` / `password` — along
with the catalog and a fortnight of bookings that includes the awkward cases
the operator console exists to surface.

### Granting operator access

`role` is not in the `User` model's `$fillable`, so no request body can set it.
That is deliberate and it is the whole access-control story: an account is a
customer unless a migration, a seeder, or someone at a console says otherwise.

```bash
php artisan tinker --execute="\App\Models\User::where('email','you@example.com')->update(['role'=>'operator'])"
```

The next request picks it up. Nothing about the role travels in the token —
`/auth/me` re-reads the row — so revoking access takes effect immediately
rather than whenever the client next signs in.

---

## No double-booking

This is the rule the whole project exists to make true, and it is the part of
the backend that changed most when it moved off Postgres.

Postgres could state it declaratively:

```sql
exclude using gist (resource_id with =, span with &&)
where (status in ('pending', 'confirmed'))
```

That constraint held against everything — the application, a migration, a
person with `psql` open. MySQL has no exclusion constraint and no range type,
so it has no translation. A unique index on `(resource_id, start_at)` would be
worse than nothing: it forbids two bookings starting at the same instant while
happily allowing 10:00–10:40 to sit on top of 10:20–11:00, which is the
overlap anyone actually hits.

So the rule moved into `app/Services/BookingWriter.php`, which:

1. opens a transaction,
2. takes `SELECT ... FOR UPDATE` on the **resource** row,
3. tests for overlap with `aStart < bEnd && bStart < aEnd`, half-open so
   touching edges do not collide,
4. writes, or raises `BookingConflict` → HTTP 409 → `ConflictError` on the
   client.

The lock is what makes step 3 sound. Without it, two operators confirming the
same slot in the same second both read "free" before either writes. Locking
the resource — the thing that can be double-booked — serialises writes for
that room and lets bookings for other rooms proceed in parallel.

**What this no longer guarantees.** Anything that writes through the
application is safe. A client with database credentials writing raw SQL is
not; the Postgres constraint would have refused that too, and this does not.
That is the real cost of the move, and `tests/Feature/ConcurrentBookingTest.php`
is what stops the remaining guarantee from quietly rotting: it asserts the
lock is taken, that a committed write from a second connection is seen and
refused, and that a held lock actually blocks a second session.

---

## What replaced Row Level Security

RLS failed closed. A query that forgot to scope itself still returned only
permitted rows, so a mistake in application code could not become a leak.
MySQL has nothing equivalent, so the checks moved to two places and both are
code that can be wrong:

- **`routes/api.php`** — the whole API surface on one screen. `EnsureOperator`
  on the write group is the entire access control for those routes.
- **The read controllers** — `ResolveOptionalUser` lets a request through
  unauthenticated, and each controller then answers "what may this caller
  see" the way a policy did: an operator sees the organization, a signed-in
  customer sees their own rows, a guest sees none. A guest gets an empty list
  rather than a 403, because that is what the policy did and because the
  booking wizard calls `/bookings` before anyone has signed in.

`tests/Feature/AccessControlTest.php` is the only thing standing where the
database used to stand, which is why it asserts the negative cases directly:
that a guest sees no customers, that a customer cannot reach the operator
writes, that registering cannot grant a role, and that the login error is the
same whether or not the address exists.

---

## Other translations

| Postgres | MySQL |
|---|---|
| `citext` / `pg_trgm` name search | `FULLTEXT` index on `customers.name` |
| `phone_digits` generated column | same, via `REGEXP_REPLACE(...) STORED` |
| `create sequence booking_reference_seq` | `booking_reference_counters`, a row locked inside the booking transaction |
| `emit_booking_event()` trigger | `BookingWriter::recordChanges()` |
| `is_within_business_hours()` | `PublicBookingController::withinBusinessHours()` |
| `book_public()` / `get_booking_by_reference()` / `cancel_by_reference()` | `POST/GET /api/public/bookings…` |
| `tstzrange` + `&&` | `start_at < ? and end_at > ?`, the same half-open test |

`CHECK` constraints survived unchanged — MariaDB 10.2+ and MySQL 8.0.16+
enforce them, so `bookings_ordered`, the price and duration floors, and
`business_hours_ordered` are all still the database's problem rather than the
application's.

---

## Known gap: the guest wizard shows every slot as free

A guest reads `/bookings` and gets an empty list, so `generateSlots()` has
nothing to mark as taken and offers times that are already booked. The server
refuses them with a 409 and the wizard says so, which is correct but late.

This is inherited, not introduced: the same was true of the Postgres build,
where `bookings_read` gave an anonymous caller no rows. Fixing it properly
means a public endpoint that returns busy ranges — start and end only, no
customer data — for a service and a date. That is a change to the booking
flow rather than a translation of it, so it is not part of this port.

---

## Tests

```bash
cd api && php artisan test     # 47 tests
```

They run against MySQL, not the usual sqlite `:memory:`. The schema is not
portable and is not meant to be — the generated column, the fulltext index and
the `CHECK` constraints are the things under test, and a suite on sqlite would
pass while testing a different database than the one that ships.
