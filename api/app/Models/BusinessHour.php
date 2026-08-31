<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Per-weekday opening times. weekday follows Date#getDay() — 0 = Sunday. */
class BusinessHour extends Model
{
    public $timestamps = false;
    public $incrementing = false;
    protected $table = 'business_hours';
    protected $primaryKey = null;

    protected $fillable = ['org_id', 'weekday', 'open_time', 'close_time', 'is_closed'];

    protected function casts(): array
    {
        return ['is_closed' => 'boolean', 'weekday' => 'integer'];
    }
}
