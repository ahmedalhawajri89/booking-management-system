<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Per-weekday opening times. weekday follows Date#getDay() — 0 = Sunday.
 *
 * Read-only through Eloquent. The table is keyed on (org_id, weekday) with no
 * surrogate id, and Eloquent builds an UPDATE from a single primary key, so a
 * save() here silently updates nothing. Writes go through the query builder —
 * see CatalogController::update().
 */
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
