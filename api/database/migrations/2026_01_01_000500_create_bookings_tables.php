<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Bookings, and the one guarantee this whole project exists to make.
 *
 * ---------------------------------------------------------------------------
 * No double-booking. What changed, and what did not.
 * ---------------------------------------------------------------------------
 * Postgres could state this declaratively:
 *
 *   exclude using gist (resource_id with =, span with &&)
 *   where (status in ('pending', 'confirmed'))
 *
 * MySQL has no exclusion constraint and no range type, so that line has no
 * translation. Pretending otherwise — a unique index on (resource_id,
 * start_at) — would be worse than nothing: it forbids two bookings starting
 * at the same instant while happily allowing 10:00–10:40 to sit on top of
 * 10:20–11:00, which is the overlap anyone actually hits.
 *
 * So the rule moves up one layer, into BookingWriter, which takes a row lock
 * on the resource before it tests for overlap. That is still a real guarantee
 * under concurrency rather than a check-then-write race: two operators
 * confirming the same slot in the same second serialise on the same lock, and
 * the second one loses. What it is not is a guarantee against a client that
 * bypasses the application and writes SQL directly. The Postgres version held
 * even then. This one does not, and the honest place to say so is here.
 *
 * The index below is what makes the overlap test cheap enough to run inside
 * that lock: (resource_id, status, start_at) covers exactly the query the
 * check makes.
 * ---------------------------------------------------------------------------
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('org_id');
            $table->string('reference')->unique();
            $table->uuid('customer_id');
            $table->uuid('service_id');
            $table->uuid('resource_id');
            $table->dateTime('start_at');
            // start_at + duration_min + buffer_min, precomputed so the overlap
            // test is a plain comparison rather than a join and an addition.
            $table->dateTime('end_at');
            $table->enum('status', ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])
                ->default('pending');
            $table->enum('payment_status', ['unpaid', 'deposit_paid', 'paid', 'refunded'])
                ->default('unpaid');
            // Snapshot at booking time. Services change price; a booking must not.
            $table->integer('price_minor');
            $table->enum('channel', ['online', 'phone', 'walk_in'])->default('online');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('org_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('customer_id')->references('id')->on('customers')->restrictOnDelete();
            $table->foreign('service_id')->references('id')->on('services')->restrictOnDelete();
            $table->foreign('resource_id')->references('id')->on('resources')->restrictOnDelete();

            // The overlap test, and nothing else, uses this one.
            $table->index(['resource_id', 'status', 'start_at'], 'bookings_overlap_idx');
            // Day and week views, and every range query on the analytics screen.
            $table->index(['org_id', 'start_at'], 'bookings_org_start_idx');
            // The customer drawer and the byCustomer index the store builds.
            $table->index(['customer_id', 'start_at'], 'bookings_customer_idx');
            // The "needs attention" list only ever looks at live bookings.
            $table->index(['org_id', 'status'], 'bookings_open_idx');
        });

        DB::statement('alter table bookings add constraint bookings_ordered check (end_at > start_at)');
        DB::statement('alter table bookings add constraint bookings_price_non_negative check (price_minor >= 0)');

        // A separate table rather than a JSON column: the audit trail is
        // queryable, append-only, and written by the server, so a client
        // cannot forge it. appendEvent() used to live in the Pinia store,
        // which made the history only as honest as the client writing it.
        Schema::create('booking_events', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('booking_id');
            $table->dateTime('at');
            $table->enum('type', [
                'created', 'confirmed', 'rescheduled', 'cancelled',
                'completed', 'no_show', 'payment_recorded', 'note_added',
            ]);
            $table->string('summary');
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();

            $table->foreign('booking_id')->references('id')->on('bookings')->cascadeOnDelete();
            $table->index(['booking_id', 'at']);
        });

        // Reference numbers, matching bookingReference() in src/lib/id.js.
        // A dedicated table because MySQL has no sequences: the row is locked
        // and incremented inside the booking transaction, so two concurrent
        // bookings cannot be handed the same number.
        Schema::create('booking_reference_counters', function (Blueprint $table) {
            $table->unsignedSmallInteger('year')->primary();
            $table->unsignedInteger('next_value')->default(500);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_reference_counters');
        Schema::dropIfExists('booking_events');
        Schema::dropIfExists('bookings');
    }
};
