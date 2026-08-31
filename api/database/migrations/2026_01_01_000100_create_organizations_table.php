<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One tenant today. org_id is on every table anyway: adding it now costs a
 * column, adding it later costs a migration on live booking data.
 *
 * Money is in minor units and durations are whole minutes throughout, matching
 * the conventions documented at the top of src/types/index.js. Instants are
 * stored UTC; the client already speaks ISO 8601 everywhere.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('timezone')->default('Asia/Riyadh');
            $table->char('currency', 3)->default('SAR');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
