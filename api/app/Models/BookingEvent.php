<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Append-only audit trail. Written by BookingWriter, never by a request body:
 * a history the client can supply is a history that says whatever the client
 * wants it to say.
 */
class BookingEvent extends Model
{
    public $timestamps = false;

    protected $fillable = ['booking_id', 'at', 'type', 'summary', 'actor_id'];

    protected function casts(): array
    {
        return ['at' => 'datetime'];
    }
}
