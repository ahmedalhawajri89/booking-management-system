<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingEvent;
use App\Models\Customer;
use App\Models\Organization;
use App\Services\BookingWriter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function __construct(private BookingWriter $writer)
    {
    }

    /** The domain shape src/types/index.js documents. */
    public static function toDomain(Booking $b): array
    {
        return [
            'id' => $b->id,
            'reference' => $b->reference,
            'customerId' => $b->customer_id,
            'serviceId' => $b->service_id,
            'resourceId' => $b->resource_id,
            'startAt' => $b->start_at->toIso8601String(),
            'endAt' => $b->end_at->toIso8601String(),
            'status' => $b->status,
            'paymentStatus' => $b->payment_status,
            'priceMinor' => $b->price_minor,
            'channel' => $b->channel,
            'notes' => $b->notes,
            'createdAt' => $b->created_at?->toIso8601String(),
            'updatedAt' => $b->updated_at?->toIso8601String(),
            'history' => $b->events->map(fn (BookingEvent $e) => [
                'at' => $e->at->toIso8601String(),
                'type' => $e->type,
                'summary' => $e->summary,
            ])->all(),
        ];
    }

    /**
     * What this caller may see, which is not the same as whether they may ask.
     *
     * This is `bookings_read` from the policies it replaces, in PHP: an
     * operator sees the organization's bookings, a signed-in customer sees
     * their own, and a guest sees none. A guest gets an empty list rather than
     * a 403 because that is what the policy did, and because the booking
     * wizard calls this before anyone has signed in — it needs slots, not an
     * error state.
     *
     * The wizard therefore shows a guest every slot as free, and the server is
     * the authority that refuses a taken one. That was true of the Postgres
     * build too; a public endpoint returning busy ranges without customer data
     * would be the better answer, and is not part of this port.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Booking::with('events')->orderBy('start_at');

        if ($user?->isOperator()) {
            $query->where('org_id', $user->org_id ?? Organization::query()->value('id'));
        } elseif ($user) {
            $query->whereIn('customer_id', Customer::where('user_id', $user->id)->select('id'));
        } else {
            return response()->json([]);
        }

        return response()->json($query->get()->map(fn (Booking $b) => self::toDomain($b))->all());
    }

    /**
     * Apply the operator's whole list.
     *
     * The stores speak in arrays, so this takes one — see the note in
     * src/data/api/repository.js about why that interface survived the move.
     * The important part is that it is a single transaction: a save that
     * conflicts on its third booking leaves the first two unwritten too,
     * rather than half-applying and reporting failure.
     */
    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'bookings' => ['required', 'array'],
            'bookings.*.id' => ['required', 'string'],
            'bookings.*.serviceId' => ['required', 'string'],
            'bookings.*.resourceId' => ['required', 'string'],
            'bookings.*.customerId' => ['required', 'string'],
            'bookings.*.startAt' => ['required', 'date'],
            'bookings.*.status' => ['required', 'in:pending,confirmed,completed,cancelled,no_show'],
            'bookings.*.paymentStatus' => ['required', 'in:unpaid,deposit_paid,paid,refunded'],
            'bookings.*.channel' => ['required', 'in:online,phone,walk_in'],
            'bookings.*.notes' => ['nullable', 'string'],
        ]);

        $org = $request->user()->org_id ?? Organization::query()->value('id');
        $actorId = $request->user()->id;

        DB::transaction(function () use ($data, $org, $actorId) {
            foreach ($data['bookings'] as $row) {
                $input = [
                    'org_id' => $org,
                    'customer_id' => $row['customerId'],
                    'service_id' => $row['serviceId'],
                    'resource_id' => $row['resourceId'],
                    'start_at' => $row['startAt'],
                    'status' => $row['status'],
                    'payment_status' => $row['paymentStatus'],
                    'channel' => $row['channel'],
                    'notes' => $row['notes'] ?? null,
                ];

                $existing = Booking::find($row['id']);
                if ($existing) {
                    $this->writer->update($existing, $input, $actorId);
                } else {
                    $this->writer->create($input, $actorId);
                }
            }
        });

        return response()->noContent();
    }
}
