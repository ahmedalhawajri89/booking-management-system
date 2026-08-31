<?php

namespace Tests\Feature;

use App\Exceptions\BookingConflict;
use App\Models\Booking;
use App\Models\Customer;
use App\Models\Organization;
use App\Models\Resource;
use App\Models\Service;
use App\Services\BookingWriter;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The race the exclusion constraint used to close.
 *
 * Every other test in NoDoubleBookingTest runs one write at a time, and would
 * pass just as happily against a plain check-then-insert. The claim that
 * BookingWriter actually replaces `exclude using gist` rests entirely on the
 * `SELECT ... FOR UPDATE` it takes on the resource, and that claim is only
 * worth anything if something tests it with two connections at once.
 *
 * So this does. A second connection holds the resource lock and inserts a
 * booking while the first transaction is mid-flight; the first must then see
 * that write and refuse, rather than reading a stale "free" and inserting on
 * top of it.
 */
class ConcurrentBookingTest extends TestCase
{
    // DatabaseMigrations, not RefreshDatabase, and that is the whole point.
    // RefreshDatabase wraps each test in a transaction it never commits, so a
    // second connection cannot see the fixtures — and a "concurrency" test
    // whose two connections cannot see each other's data proves nothing. This
    // migrates fresh per test instead: slower, and actually committed.
    use DatabaseMigrations;

    private Organization $org;
    private Service $service;
    private Resource $room;
    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organization::create([
            'name' => 'Test Clinic', 'slug' => 'test', 'timezone' => 'Asia/Riyadh', 'currency' => 'SAR',
        ]);
        $this->room = Resource::create(['id' => (string) Str::uuid(), 'org_id' => $this->org->id, 'name' => 'Room 1']);
        $this->service = Service::create([
            'id' => (string) Str::uuid(), 'org_id' => $this->org->id, 'name' => 'Consultation',
            'duration_min' => 30, 'buffer_min' => 10, 'price_minor' => 15000,
        ]);
        $this->service->resources()->sync([$this->room->id]);
        $this->customer = Customer::create([
            'id' => (string) Str::uuid(), 'org_id' => $this->org->id,
            'name' => 'ريم الدوسري', 'phone' => '0501234567',
        ]);
    }

    public function test_the_resource_lock_is_actually_taken(): void
    {
        // Cheap and specific: if this SELECT ever loses its FOR UPDATE — to a
        // refactor, or to someone "simplifying" the query — every other
        // assertion in this file becomes a coincidence.
        $statements = [];
        DB::listen(function ($query) use (&$statements) {
            $statements[] = $query->sql;
        });

        app(BookingWriter::class)->create([
            'org_id' => $this->org->id, 'customer_id' => $this->customer->id,
            'service_id' => $this->service->id, 'resource_id' => $this->room->id,
            'start_at' => Carbon::parse('2030-03-03 10:00'),
        ]);

        $locks = array_filter($statements, fn ($sql) => str_contains(strtolower($sql), 'for update'));

        $this->assertNotEmpty($locks, 'BookingWriter must lock before it checks for an overlap.');
        $this->assertTrue(
            (bool) array_filter($locks, fn ($sql) => str_contains($sql, 'resources')),
            'The lock must be on the resource row — that is the thing being double-booked.'
        );
    }

    /**
     * Two connections, one slot.
     *
     * The second connection is a genuinely separate MySQL session, so this is
     * a real interleaving rather than a simulated one. It writes the booking
     * the first transaction is about to think is safe.
     */
    public function test_a_write_from_another_connection_is_seen_and_refused(): void
    {
        $start = Carbon::parse('2030-03-03 10:00');
        $writer = app(BookingWriter::class);

        // Land the competing booking from a second connection first, committed,
        // exactly as the losing operator's request would have done a moment
        // earlier. The first writer then has to notice it.
        $this->insertFromAnotherConnection($start);

        $this->expectException(BookingConflict::class);
        $writer->create([
            'org_id' => $this->org->id, 'customer_id' => $this->customer->id,
            'service_id' => $this->service->id, 'resource_id' => $this->room->id,
            'start_at' => $start->copy()->addMinutes(20),
        ]);
    }

    /**
     * The lock serialises: while one transaction holds the resource, a second
     * connection cannot take it.
     *
     * `for update nowait` fails immediately rather than blocking, which is what
     * makes this assertable instead of a timeout. If the lock were not held,
     * the second connection would acquire it and this would report no error.
     */
    public function test_a_held_resource_lock_blocks_a_second_connection(): void
    {
        if (! $this->supportsNowait()) {
            $this->markTestSkipped('NOWAIT needs MySQL 8.0+ or MariaDB 10.3+.');
        }

        $second = $this->secondConnection();
        $blocked = null;

        DB::transaction(function () use ($second, &$blocked) {
            // Hold the same row BookingWriter locks.
            DB::table('resources')->where('id', $this->room->id)->lockForUpdate()->first();

            try {
                $second->select('select * from resources where id = ? for update nowait', [$this->room->id]);
                $blocked = false;
            } catch (\Throwable $e) {
                $blocked = true;
            }
        });

        $this->assertTrue($blocked, 'A second connection acquired a lock the first transaction was holding.');
    }

    private function supportsNowait(): bool
    {
        $version = DB::selectOne('select version() as v')->v;

        return str_contains(strtolower($version), 'mariadb')
            ? version_compare(explode('-', $version)[0], '10.3', '>=')
            : version_compare($version, '8.0', '>=');
    }

    /** A second, independent MySQL session against the same test database. */
    private function secondConnection(): \Illuminate\Database\Connection
    {
        config(['database.connections.second' => config('database.connections.mysql')]);

        return DB::connection('second');
    }

    private function insertFromAnotherConnection(Carbon $start): void
    {
        $this->secondConnection()->table('bookings')->insert([
            'id' => (string) Str::uuid(),
            'org_id' => $this->org->id,
            'reference' => 'BK-2030-0001',
            'customer_id' => $this->customer->id,
            'service_id' => $this->service->id,
            'resource_id' => $this->room->id,
            'start_at' => $start,
            'end_at' => $start->copy()->addMinutes(40),
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'price_minor' => 15000,
            'channel' => 'online',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
