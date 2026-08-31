<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasUuids;

    /** Statuses that occupy their slot. Cancelled and no-show release the time. */
    public const BLOCKING = ['pending', 'confirmed'];

    protected $fillable = [
        'id', 'org_id', 'reference', 'customer_id', 'service_id', 'resource_id',
        'start_at', 'end_at', 'status', 'payment_status', 'price_minor',
        'channel', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_at' => 'datetime',
            'end_at' => 'datetime',
            'price_minor' => 'integer',
        ];
    }

    public function events()
    {
        return $this->hasMany(BookingEvent::class)->orderBy('at');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function resource()
    {
        return $this->belongsTo(Resource::class);
    }
}
