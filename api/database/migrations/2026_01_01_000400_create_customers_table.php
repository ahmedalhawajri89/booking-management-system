<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The phone is the identity key in this market — used for lookup and dedupe.
 *
 * `phone_digits` puts normalisePhone() from src/stores/customers.js in the
 * database as a stored generated column, so "٠٥٠ ١٢٣ ٤٥٦٧", "050-123-4567"
 * and "0501234567" collapse to one customer regardless of which client wrote
 * the row. The unique index is on the derived column, not the raw one: a
 * unique index on `phone` would let the same person in three times.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('org_id');
            // Set when a customer signs up and claims their record; null for
            // the many who only ever book as guests.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('org_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->index('org_id');
        });

        // Blueprint's storedAs() cannot express this portably enough to be
        // worth it, and the expression is the point — so it is raw and visible.
        DB::statement(
            "alter table customers
             add column phone_digits varchar(32)
             as (regexp_replace(phone, '[^0-9]', '')) stored"
        );
        DB::statement('alter table customers add unique customers_org_phone_unique (org_id, phone_digits)');

        // Name search in the customers screen. Arabic names are not
        // prefix-friendly and the client searches substrings, so this is a
        // fulltext index rather than a plain one — MySQL's answer to the
        // trigram index Postgres had.
        DB::statement('alter table customers add fulltext customers_name_fulltext (name)');
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
