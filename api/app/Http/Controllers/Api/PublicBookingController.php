<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Customer;
use App\Models\Organization;
use App\Models\Service;
use App\Services\BookingWriter;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * The three things a visitor with no account can do.
 *
 * These were security-definer functions in Postgres for a reason that has not
 * changed: the guest paths need to write and read across tables that an
 * anonymous caller must not touch directly. Exposing the tables and letting a
 * policy sort it out would be the short version, and wrong — it would let a
 * caller choose their own price, end time and status.
 *
 * Everything that matters is computed here from the service row. The caller is
 * trusted for the service, the resource, the start time and who they are, and
 * for nothing else.
 */
class PublicBookingController extends Controller
{
    public function __construct(private BookingWriter $writer)
    {
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'serviceId' => ['required', 'string'],
            'resourceId' => ['required', 'string'],
            'startAt' => ['required', 'date'],
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'phone' => ['required', 'string', 'max:64'],
            'email' => ['nullable', 'email', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $org = Organization::query()->value('id');

        if (strlen(Customer::normalisePhone($data['phone'])) < 9) {
            return response()->json(['error' => 'invalid_phone'], 422);
        }

        $service = Service::with('resources:id')
            ->where('id', $data['serviceId'])
            ->where('org_id', $org)
            ->where('is_active', true)
            ->first();

        if (! $service) {
            return response()->json(['error' => 'unknown_service'], 422);
        }

        if (! $service->resources->contains('id', $data['resourceId'])) {
            return response()->json(['error' => 'resource_not_offered'], 422);
        }

        $start = Carbon::parse($data['startAt']);
        if ($start->isPast()) {
            return response()->json(['error' => 'start_in_past'], 422);
        }

        $end = $start->copy()->addMinutes($service->occupiedMinutes());
        if (! $this->withinBusinessHours($org, $start, $end)) {
            return response()->json(['error' => 'outside_business_hours'], 422);
        }

        // BookingWriter opens its own transaction and takes the resource lock;
        // the customer has to exist before that, so it is written first and
        // rolls back with the booking if the slot turns out to be taken.
        return DB::transaction(function () use ($org, $data, $service) {
            $customer = $this->upsertCustomer($org, $data);

            $booking = $this->writer->create([
                'org_id' => $org,
                'customer_id' => $customer->id,
                'service_id' => $service->id,
                'resource_id' => $data['resourceId'],
                'start_at' => $data['startAt'],
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'channel' => 'online',
                'notes' => $data['notes'] ?? null,
            ]);

            return response()->json(['id' => $booking->id, 'reference' => $booking->reference], 201);
        });
    }

    /**
     * When a resource is busy, and nothing else.
     *
     * The booking wizard needs to know which times are taken so it can grey
     * them out. It cannot read /bookings to find out — a guest gets an empty
     * list there, deliberately, because that endpoint carries who booked what.
     * Without this the wizard offered slots that were already gone and the
     * visitor only learned otherwise on submit.
     *
     * So this answers the narrowest possible version of the question: two
     * timestamps per busy interval on one resource, in one date range. No id,
     * no customer, no service, no status, no price — nothing that says who is
     * in the room, only that the room is occupied. Cancelled and no-show
     * bookings are absent because they release their time, matching BLOCKING
     * in src/lib/availability.js.
     */
    public function availability(Request $request)
    {
        $data = $request->validate([
            'resourceId' => ['required', 'string'],
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);

        $from = Carbon::parse($data['from'])->startOfDay();
        // Capped so a caller cannot ask for a decade and make this a scan.
        $to = Carbon::parse($data['to'])->endOfDay()->min($from->copy()->addDays(60));

        $busy = Booking::query()
            ->where('resource_id', $data['resourceId'])
            ->whereIn('status', Booking::BLOCKING)
            ->where('start_at', '<', $to)
            ->where('end_at', '>', $from)
            ->orderBy('start_at')
            ->get(['start_at', 'end_at']);

        return response()->json(
            $busy->map(fn (Booking $b) => [
                'startAt' => $b->start_at->toIso8601String(),
                'endAt' => $b->end_at->toIso8601String(),
            ])->all()
        );
    }

    /** Same identity rule as the client: the phone is the key. */
    private function upsertCustomer(string $org, array $data): Customer
    {
        $digits = Customer::normalisePhone($data['phone']);
        $existing = Customer::where('org_id', $org)->where('phone_digits', $digits)->first();

        // `email` is optional, so it may be absent from the payload entirely
        // rather than present and null — and an absent one must never blank
        // out an address the customer gave us on a previous booking.
        $email = $data['email'] ?? null;

        if ($existing) {
            $existing->update([
                'name' => trim($data['name']),
                'email' => $email ?: $existing->email,
            ]);

            return $existing;
        }

        return Customer::create([
            'org_id' => $org,
            'name' => trim($data['name']),
            'phone' => trim($data['phone']),
            'email' => $email ?: null,
        ]);
    }

    /**
     * The same rule isOpenOn()/generateSlots() apply on the client, enforced
     * where the client cannot be trusted.
     *
     * Weekday and wall-clock time are only meaningful in the organization's own
     * zone, so the instants are converted before either is read.
     */
    private function withinBusinessHours(string $org, Carbon $start, Carbon $end): bool
    {
        $tz = Organization::query()->where('id', $org)->value('timezone');
        if (! $tz) {
            return false;
        }

        $localStart = $start->copy()->setTimezone($tz);
        $localEnd = $end->copy()->setTimezone($tz);

        // A booking that crosses midnight cannot sit inside one day's hours.
        if (! $localStart->isSameDay($localEnd)) {
            return false;
        }

        $hours = DB::table('business_hours')
            ->where('org_id', $org)
            ->where('weekday', (int) $localStart->format('w'))
            ->first();

        if (! $hours || $hours->is_closed) {
            return false;
        }

        return $localStart->format('H:i:s') >= $hours->open_time
            && $localEnd->format('H:i:s') <= $hours->close_time;
    }

    /**
     * Look up a booking by its reference.
     *
     * Two factors, always. BK-2026-0431 is sequential and trivially guessable,
     * so a lookup keyed on the reference alone would expose every booking to
     * anyone who can count. Only the fields the customer-facing page renders
     * come back.
     */
    public function show(Request $request, string $reference)
    {
        $data = $request->validate(['phone' => ['required', 'string', 'max:64']]);
        $booking = $this->findByReferenceAndPhone($reference, $data['phone']);

        if (! $booking) {
            return response()->json(['error' => 'not_found'], 404);
        }

        return response()->json([
            'reference' => $booking->reference,
            'startAt' => $booking->start_at->toIso8601String(),
            'endAt' => $booking->end_at->toIso8601String(),
            'status' => $booking->status,
            'paymentStatus' => $booking->payment_status,
            'priceMinor' => $booking->price_minor,
            'serviceName' => $booking->service->name,
            'customerName' => $booking->customer->name,
        ]);
    }

    /** Cancel your own booking from that same page. */
    public function cancel(Request $request, string $reference)
    {
        $data = $request->validate(['phone' => ['required', 'string', 'max:64']]);
        $booking = $this->findByReferenceAndPhone($reference, $data['phone']);

        if (! $booking || ! in_array($booking->status, Booking::BLOCKING, true)) {
            return response()->json(['error' => 'not_cancellable'], 404);
        }

        $this->writer->update($booking, ['status' => 'cancelled']);

        return response()->json(['cancelled' => true]);
    }

    private function findByReferenceAndPhone(string $reference, string $phone): ?Booking
    {
        $last4 = substr(Customer::normalisePhone($phone), -4);
        if (strlen($last4) < 4) {
            return null;
        }

        return Booking::with(['service', 'customer'])
            ->whereRaw('upper(reference) = ?', [strtoupper(trim($reference))])
            ->whereHas('customer', fn ($q) => $q->whereRaw('right(phone_digits, 4) = ?', [$last4]))
            ->first();
    }
}
