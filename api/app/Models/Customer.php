<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasUuids;

    protected $fillable = ['id', 'org_id', 'user_id', 'name', 'phone', 'email', 'notes'];

    /** Written by the database as a stored generated column — never by us. */
    protected $guarded = ['phone_digits'];

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * The same rule normalisePhone() applies on the client, so a lookup here
     * and a lookup there agree about who is who.
     */
    public static function normalisePhone(?string $phone): string
    {
        return preg_replace('/\D/', '', $phone ?? '');
    }
}
