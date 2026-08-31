# The API

Laravel 12 on MySQL, behind the same `Repository` interface the browser-only
backend implements. It exists so this project is a real system rather than a
screen mockup: the availability rules, the access control and the audit trail
are enforced here, where a client cannot reach them.

Nothing in this directory is required to run the app. With `VITE_API_URL`
unset the frontend runs entirely on `localStorage` with seeded demo data, which
is how the public demo is deployed.

## Running it

```bash
cp .env.example .env
php artisan key:generate
mysql -u root -e "create database booking_management character set utf8mb4 collate utf8mb4_unicode_ci"
php artisan migrate --seed
php artisan serve
```

Then point the frontend at it — `echo "VITE_API_URL=http://localhost:8000/api" > ../.env.local`.

The seeder creates one operator: `operator@example.com` / `password`.

## What to read first

| | |
|---|---|
| `routes/api.php` | the whole surface on one screen — and the access-control document, now that RLS is gone |
| `app/Services/BookingWriter.php` | the transaction that makes double-booking impossible, and the honest limits of it |
| `app/Http/Controllers/Api/PublicBookingController.php` | everything a visitor with no account may do |
| `database/migrations/2026_01_01_000500_*` | the bookings schema, and why the Postgres exclusion constraint has no translation here |

## Tests

```bash
php artisan test
```

53 tests against a real MySQL database rather than sqlite `:memory:`. That is
deliberate: the `phone_digits` generated column, the fulltext index and the
`CHECK` constraints are among the things under test, and a suite running on
sqlite would pass while testing a different database than the one that ships.

Create the test database once: `mysql -u root -e "create database booking_management_test character set utf8mb4"`.

---

See [../docs/BACKEND.md](../docs/BACKEND.md) for what moved when this replaced
Supabase and Postgres, and what was lost along the way.
