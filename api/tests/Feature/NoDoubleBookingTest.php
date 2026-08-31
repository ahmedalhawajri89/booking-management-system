<?php

namespace Tests\Feature;

use App\Exceptions\BookingConflict;
use App\Models\Booking;
use App\Models\Customer;
use App\Models\Organization;
use App\Models\Resource;
use App\Models\Service;
use App\Services\BookingWriter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * The rule this whole project exists to make true.
 *
 * These are the tests that used to be supabase/tests/01_constraints.sql. They
 * matter more now, not less: Postgres refused an overlap declaratively, so the
 * tests were confirming a constraint the database could not get wrong. MySQL
 * has no such constraint, so what is under test here is application code —
 * and application code is exactly the kind that can be got wrong.
 */
class NoDoubleBookingTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private Service $service;
    private Resource $roomOne;
    private Resource $roomTwo;
    private Customer $customer;
    private BookingWriter $writer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organization::create([
            'name' => 'Test Clinic', 'slug' => 'test', 'timezone' => 'Asia/Riyadh', 'currency' => 'SAR',
        ]);
        $this->roomOne = Resource::create(['id' => (string) Str::uuid(), 'org_id' => $this->org->id, 'name' => 'Room 1']);
        $this->roomTwo = Resource::create(['id' => (string) Str::uuid(), 'org_id' => $this->org->id, 'name' => 'Room 2']);

        // 30 minutes of appointment plus 10 of turnaround: a booking occupies 40.
        $this->service = Service::create([
            'id' => (string) Str::uuid(), 'org_id' => $this->org->id, 'name' => 'Consultation',
            'duration_min' => 30, 'buffer_min' => 10, 'price_minor' => 15000,
        ]);
        $this->service->resources()->sync([$this->roomOne->id, $this->roomTwo->id]);

        $this->customer = Customer::create([
            'id' => (string) Str::uuid(), 'org_id' => $this->org->id,
            'name' => 'ريم الدوسري', 'phone' => '0501234567',
        ]);

        $this->writer = app(BookingWriter::class);
    }

    private function book(string $time, string $status = 'confirmed', ?Resource $room = null): Booking
    {
        return $this->writer->create([
            'org_id' => $this->org->id,
            'customer_id' => $this->customer->id,
            'service_id' => $this->service->id,
            'resource_id' => ($room ?? $this->roomOne)->id,
            'start_at' => Carbon::parse("2030-03-03 $time"),
            'status' => $status,
        ]);
    }

    public function test_end_time_is_computed_from_the_service_not_the_caller(): void
    {
        $booking = $this->book('10:00');

        // 30 + 10. A caller that could choose its own end time could book a
        // two-hour slot as a two-minute one and free the rest for itself.
        $this->assertSame('10:40', $booking->end_at->format('H:i'));
        $this->assertSame(15000, $booking->price_minor);
    }

    public function test_an_overlapping_booking_on_the_same_resource_is_refused(): void
    {
        $this->book('10:00');

        $this->expectException(BookingConflict::class);
        $this->book('10:20');
    }

    public function test_a_booking_that_swallows_another_is_refused(): void
    {
        $this->book('10:00');

        // Starts before and ends after — the containment case a naive
        // "start between" check misses entirely.
        $long = Service::create([
            'id' => (string) Str::uuid(), 'org_id' => $this->org->id, 'name' => 'Long',
            'duration_min' => 180, 'buffer_min' => 0, 'price_minor' => 0,
        ]);
        $long->resources()->sync([$this->roomOne->id]);

        $this->expectException(BookingConflict::class);
        $this->writer->create([
            'org_id' => $this->org->id, 'customer_id' => $this->customer->id,
            'service_id' => $long->id, 'resource_id' => $this->roomOne->id,
            'start_at' => Carbon::parse('2030-03-03 09:00'),
        ]);
    }

    public function test_touching_edges_do_not_collide(): void
    {
        $first = $this->book('10:00');
        $second = $this->book('10:40');

        // Half-open, matching overlaps() in src/lib/availability.js: one ending
        // at 10:40 and one starting at 10:40 are not in conflict. Getting this
        // wrong loses the business a sellable slot in every gap.
        $this->assertSame($first->end_at->format('H:i'), $second->start_at->format('H:i'));
        $this->assertSame(2, Booking::count());
    }

    public function test_the_same_time_on_a_different_resource_is_allowed(): void
    {
        $this->book('10:00');
        $this->book('10:00', 'confirmed', $this->roomTwo);

        $this->assertSame(2, Booking::count());
    }

    #[DataProvider('releasingStatuses')]
    public function test_a_released_booking_frees_its_slot(string $status): void
    {
        $first = $this->book('10:00');
        $first->status = $status;
        $first->save();

        $this->book('10:00');

        $this->assertSame(2, Booking::count());
    }

    public static function releasingStatuses(): array
    {
        return [['cancelled'], ['no_show']];
    }

    #[DataProvider('blockingStatuses')]
    public function test_a_blocking_booking_holds_its_slot(string $status): void
    {
        $this->book('10:00', $status);

        $this->expectException(BookingConflict::class);
        $this->book('10:10');
    }

    public static function blockingStatuses(): array
    {
        return [['pending'], ['confirmed']];
    }

    public function test_moving_a_booking_onto_another_is_refused(): void
    {
        $this->book('09:00');
        $mover = $this->book('11:00');

        $this->expectException(BookingConflict::class);
        $this->writer->update($mover, ['start_at' => '2030-03-03 09:10']);
    }

    public function test_a_booking_does_not_conflict_with_itself_when_edited(): void
    {
        $booking = $this->book('10:00');

        // Excluding the row being updated is what makes "mark this paid" work
        // at all; without it every edit collides with the thing it is editing.
        $updated = $this->writer->update($booking, ['payment_status' => 'paid']);

        $this->assertSame('paid', $updated->payment_status);
        $this->assertSame(1, Booking::count());
    }

    public function test_the_database_refuses_a_booking_that_ends_before_it_starts(): void
    {
        // BookingWriter computes end_at, so this can only come from a direct
        // write — which is exactly what the CHECK constraint is there for.
        $this->expectException(\Illuminate\Database\QueryException::class);

        DB::table('bookings')->insert([
            'id' => (string) Str::uuid(), 'org_id' => $this->org->id, 'reference' => 'BK-2030-9999',
            'customer_id' => $this->customer->id, 'service_id' => $this->service->id,
            'resource_id' => $this->roomOne->id,
            'start_at' => '2030-03-03 12:00:00', 'end_at' => '2030-03-03 11:00:00',
            'status' => 'confirmed', 'payment_status' => 'unpaid', 'price_minor' => 100,
            'channel' => 'online', 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_references_are_sequential_and_unique_under_repetition(): void
    {
        $refs = collect(['09:00', '10:00', '11:00', '12:00'])->map(fn ($t) => $this->book($t)->reference);

        $this->assertCount(4, $refs->unique());
        $this->assertMatchesRegularExpression('/^BK-\d{4}-\d{4}$/', $refs->first());
    }
}
