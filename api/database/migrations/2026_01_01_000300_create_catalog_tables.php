<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * What the business sells, on what, and when.
 *
 * Resources are the thing that can be double-booked: a room, a chair, a
 * practitioner. Services carry the duration and buffer that decide how long a
 * booking occupies one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resources', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('org_id');
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('org_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->index(['org_id', 'is_active']);
        });

        Schema::create('services', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('org_id');
            $table->string('name');
            $table->text('description')->default('');
            $table->integer('duration_min');
            $table->integer('buffer_min')->default(0);
            $table->integer('price_minor')->default(0);
            // The client resolves this to a component through src/lib/icons.js.
            // A Vue component cannot be stored, which is why the key travels.
            $table->string('icon_key')->default('Sparkles');
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('org_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->index(['org_id', 'is_active']);
        });

        // Service.resourceIds, normalised.
        Schema::create('service_resources', function (Blueprint $table) {
            $table->uuid('service_id');
            $table->uuid('resource_id');

            $table->primary(['service_id', 'resource_id']);
            $table->foreign('service_id')->references('id')->on('services')->cascadeOnDelete();
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });

        Schema::create('business_hours', function (Blueprint $table) {
            $table->uuid('org_id');
            $table->unsignedTinyInteger('weekday');
            $table->time('open_time')->default('09:00');
            $table->time('close_time')->default('18:00');
            $table->boolean('is_closed')->default(false);

            $table->primary(['org_id', 'weekday']);
            $table->foreign('org_id')->references('id')->on('organizations')->cascadeOnDelete();
        });

        // Blueprint has no check() helper, so these are raw. They are worth the
        // extra lines: a service with a zero duration generates infinite slots,
        // and an inverted day makes slot generation return nothing while saying
        // nothing about why. The client refuses both in SettingsView; the
        // database refuses them for every other path.
        DB::statement('alter table services add constraint services_duration_positive check (duration_min > 0)');
        DB::statement('alter table services add constraint services_buffer_non_negative check (buffer_min >= 0)');
        DB::statement('alter table services add constraint services_price_non_negative check (price_minor >= 0)');
        DB::statement('alter table business_hours add constraint business_hours_weekday_range check (weekday between 0 and 6)');
        DB::statement('alter table business_hours add constraint business_hours_ordered check (is_closed = 1 or close_time > open_time)');
    }

    public function down(): void
    {
        Schema::dropIfExists('business_hours');
        Schema::dropIfExists('service_resources');
        Schema::dropIfExists('services');
        Schema::dropIfExists('resources');
    }
};
