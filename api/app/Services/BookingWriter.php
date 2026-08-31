<?php

namespace App\Services;

use App\Exceptions\BookingConflict;
use App\Models\Booking;
use App\Models\BookingEvent;
use App\Models\Resource;
use App\Models\Service;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Every write that can create an overlap goes through here.
 *
 * ---------------------------------------------------------------------------
 * Why a class and not a constraint
 * ---------------------------------------------------------------------------
 * Postgres enforced "no double-booking" declaratively, with an exclusion
 * constraint over a range type. MySQL has neither, so the rule has to be
 * enforced by whoever writes — and a check-then-insert, on its own, is a race:
 * two operators confirming the same slot in the same second both read "free"
 * before either writes.
 *
 * What closes that race is the lock on the *resource* row, taken before the
 * overlap query runs. A resource is exactly the thing that can be
 * double-booked, so serialising writes per resource is the narrowest lock
 * that makes the check sound: concurrent bookings for different rooms still
 * proceed in parallel, and two for the same room queue up, with the second
 * one seeing the first one's write.
 *
 * The honest limit: this holds for anything that writes through the
 * application. A client with database credentials writing raw SQL can still
 * insert an overlap, which the Postgres constraint would have refused. That
 * is the real cost of the move, and it is stated here rather than glossed.
 * ---------------------------------------------------------------------------
 */
class BookingWriter
{
    /**
     * Half-open overlap: touching edges do not collide, matching overlaps() in
     * src/lib/availability.js exactly. An appointment ending at 10:00 and one
     * starting at 10:00 do not conflict; any real overlap does.
     *
     * Must be called inside a transaction that already holds the resource lock.
     */
    private function overlaps(string $resourceId, CarbonInterface $start, CarbonInterface $end, ?string $ignoreId = null): bool
    {
        return Booking::query()
            ->where('resource_id', $resourceId)
            ->whereIn('status', Booking::BLOCKING)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->where('start_at', '<', $end)
            ->where('end_at', '>', $start)
            ->exists();
    }

    /** Takes the per-resource mutex. Everything after this call is serialised. */
    private function lockResource(string $resourceId): void
    {
        Resource::query()->whereKey($resourceId)->lockForUpdate()->first();
    }

    /**
     * BK-2026-0431 — human-quotable over the phone, matching
     * bookingReference() in src/lib/id.js.
     *
     * MySQL has no sequences, so the counter is a row. Locking it inside the
     * booking transaction is what stops two concurrent bookings being handed
     * the same number; a `max(reference) + 1` would hand out duplicates under
     * exactly the load that makes them matter.
     */
    private function nextReference(): string
    {
        $year = (int) now()->format('Y');

        DB::table('booking_reference_counters')->insertOrIgnore([
            'year' => $year,
            'next_value' => 500,
        ]);

        $row = DB::table('booking_reference_counters')->where('year', $year)->lockForUpdate()->first();
        $value = $row->next_value;
        DB::table('booking_reference_counters')->where('year', $year)->update(['next_value' => $value + 1]);

        return sprintf('BK-%d-%04d', $year, $value);
    }

    private function event(Booking $booking, string $type, string $summary, ?int $actorId): void
    {
        BookingEvent::create([
            'booking_id' => $booking->id,
            'at' => now(),
            'type' => $type,
            'summary' => $summary,
            'actor_id' => $actorId,
        ]);
    }

    /**
     * Create a booking, computing everything the caller must not choose.
     *
     * Duration, buffer, end time, price and reference come from the service
     * row and the server clock. The caller is trusted for the service, the
     * resource, the start time and who they are, and for nothing else — the
     * same division the book_public function drew in Postgres.
     *
     * @throws BookingConflict
     */
    public function create(array $input, ?int $actorId = null): Booking
    {
        return DB::transaction(function () use ($input, $actorId) {
            /** @var Service $service */
            $service = Service::query()->whereKey($input['service_id'])->firstOrFail();

            $start = Carbon::parse($input['start_at']);
            $end = $start->copy()->addMinutes($service->occupiedMinutes());

            $this->lockResource($input['resource_id']);
            if ($this->overlaps($input['resource_id'], $start, $end)) {
                throw new BookingConflict();
            }

            $booking = Booking::create([
                'org_id' => $input['org_id'],
                'reference' => $this->nextReference(),
                'customer_id' => $input['customer_id'],
                'service_id' => $service->id,
                'resource_id' => $input['resource_id'],
                'start_at' => $start,
                'end_at' => $end,
                'status' => $input['status'] ?? 'pending',
                'payment_status' => $input['payment_status'] ?? 'unpaid',
                'price_minor' => $service->price_minor,
                'channel' => $input['channel'] ?? 'online',
                'notes' => $input['notes'] ?? null,
            ]);

            $this->event($booking, 'created', 'أُنشئ الحجز', $actorId);
            if ($booking->status === 'confirmed') {
                $this->event($booking, 'confirmed', 'تم تأكيد الحجز', $actorId);
            }

            return $booking->load('events');
        });
    }

    /**
     * Apply the client's view of a booking to the stored row, and record what
     * actually changed.
     *
     * The history is derived here by comparing old and new, never taken from
     * the request. That is the whole reason it moved off the client: an audit
     * trail the caller supplies is a claim, not a record.
     *
     * @throws BookingConflict
     */
    public function update(Booking $booking, array $input, ?int $actorId = null): Booking
    {
        return DB::transaction(function () use ($booking, $input, $actorId) {
            $before = $booking->replicate();

            $start = isset($input['start_at']) ? Carbon::parse($input['start_at']) : $booking->start_at;
            $status = $input['status'] ?? $booking->status;
            $resourceId = $input['resource_id'] ?? $booking->resource_id;

            $moved = ! $start->equalTo($booking->start_at) || $resourceId !== $booking->resource_id;
            $becomesBlocking = in_array($status, Booking::BLOCKING, true);

            // A cancelled booking releases its time, so it needs no check. One
            // that moves, or comes back to life, has to earn its slot again.
            if ($becomesBlocking && ($moved || ! in_array($booking->status, Booking::BLOCKING, true))) {
                $service = Service::query()->whereKey($input['service_id'] ?? $booking->service_id)->firstOrFail();
                $end = $start->copy()->addMinutes($service->occupiedMinutes());

                $this->lockResource($resourceId);
                if ($this->overlaps($resourceId, $start, $end, $booking->id)) {
                    throw new BookingConflict();
                }
                $booking->end_at = $end;
            }

            $booking->fill([
                'status' => $status,
                'payment_status' => $input['payment_status'] ?? $booking->payment_status,
                'resource_id' => $resourceId,
                'notes' => $input['notes'] ?? $booking->notes,
            ]);
            $booking->start_at = $start;
            $booking->save();

            $this->recordChanges($booking, $before, $actorId);

            return $booking->load('events');
        });
    }

    /** The trigger that used to do this in Postgres, in one place instead of two. */
    private function recordChanges(Booking $now, Booking $before, ?int $actorId): void
    {
        if ($now->status !== $before->status) {
            $type = match ($now->status) {
                'confirmed' => 'confirmed',
                'completed' => 'completed',
                'cancelled' => 'cancelled',
                'no_show' => 'no_show',
                default => 'note_added',
            };
            $this->event($now, $type, match ($now->status) {
                'pending' => 'أُعيد الحجز إلى الانتظار',
                'confirmed' => 'تم تأكيد الحجز',
                'completed' => 'اكتملت الخدمة',
                'cancelled' => 'أُلغي الحجز',
                'no_show' => 'لم يحضر العميل',
                default => 'تغيّرت حالة الحجز',
            }, $actorId);
        }

        if ($now->payment_status !== $before->payment_status) {
            $this->event($now, 'payment_recorded', match ($now->payment_status) {
                'unpaid' => 'أُلغي تسجيل الدفع',
                'deposit_paid' => 'سُجّل عربون',
                'paid' => 'سُجّل الدفع كاملاً',
                'refunded' => 'تمت إعادة المبلغ',
                default => 'تغيّرت حالة الدفع',
            }, $actorId);
        }

        if (! $now->start_at->equalTo($before->start_at)) {
            $this->event($now, 'rescheduled', 'أُعيدت جدولة الحجز', $actorId);
        }

        if (($now->notes ?? '') !== ($before->notes ?? '')) {
            $this->event($now, 'note_added', 'أُضيفت ملاحظة', $actorId);
        }
    }
}
