<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Operator or customer, and which organization the user belongs to.
 *
 * `role` is deliberately not fillable on the model. Postgres had this as a
 * JWT claim the database read on every policy evaluation; MySQL has no such
 * thing, so the equivalent guarantee is that the column can only be written
 * by a migration, a seeder or an explicit assignment on the server — never by
 * anything arriving in a request body. That is what stops "operator" from
 * being a field a visitor can add to their sign-up form.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('org_id')->nullable()->after('id');
            $table->enum('role', ['operator', 'customer'])->default('customer')->after('email');
            $table->string('phone')->nullable()->after('role');
            $table->string('avatar_url')->nullable()->after('phone');

            $table->foreign('org_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->index(['org_id', 'role']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['org_id']);
            $table->dropIndex(['org_id', 'role']);
            $table->dropColumn(['org_id', 'role', 'phone', 'avatar_url']);
        });
    }
};
