<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\PublicBookingController;
use App\Http\Middleware\EnsureOperator;
use App\Http\Middleware\ResolveOptionalUser;
use Illuminate\Support\Facades\Route;

/*
|---------------------------------------------------------------------------
| The whole API surface, on one screen.
|
| This file replaced 147 lines of Row Level Security. Postgres checked a
| policy on every row of every query, so a route that forgot to scope itself
| was still safe. Nothing here does that: what protects an endpoint is the
| middleware on its group and nothing else, which makes this file the security
| document of the backend. It is short on purpose — a surface you can read in
| one screen is a surface you can audit.
|
| The reads below are deliberately not all-or-nothing, because the policies
| they replace were not either. ResolveOptionalUser lets a request through
| unauthenticated and still resolves a user when a token is present, so a
| controller can answer "what may this caller see" the way a policy did — with
| a narrower result set rather than a refusal. A guest reading /bookings gets
| an empty list, exactly as `bookings_read` gave them no rows; they do not get
| a 403 that would break the booking wizard.
|---------------------------------------------------------------------------
*/

// ----------------------------------------------------------------- public
// Rate-limited harder than the rest: these are the only endpoints an
// unauthenticated caller can reach, so they are the only ones worth
// hammering. Booking is heavier than reading because it writes.
Route::prefix('public')->middleware('throttle:20,1')->group(function () {
    Route::post('bookings', [PublicBookingController::class, 'store']);
    Route::get('bookings/{reference}', [PublicBookingController::class, 'show']);
    Route::post('bookings/{reference}/cancel', [PublicBookingController::class, 'cancel']);
});

// ------------------------------------------------------------------- auth
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:5,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

// -------------------------------------------------------------- app reads
// Scoped by who is asking, not gated on it — see the note above. The guest
// booking page has no session and still has to show services, resources and
// opening hours, so the catalog is readable by everyone; only active rows
// reach a caller who is not an operator, because a service the operator
// turned off should not be discoverable.
Route::middleware(ResolveOptionalUser::class)->group(function () {
    Route::get('catalog', [CatalogController::class, 'show']);
    Route::get('bookings', [BookingController::class, 'index']);
    Route::get('customers', [CustomerController::class, 'index']);
});

// ------------------------------------------------------------- app writes
// Every write the console makes. There is no non-operator path into any of
// these, and no delete route anywhere: cancelling is a state, and the audit
// trail has to survive it.
Route::middleware(['auth:sanctum', EnsureOperator::class])->group(function () {
    Route::put('bookings', [BookingController::class, 'bulkUpdate']);
    Route::put('customers', [CustomerController::class, 'bulkUpdate']);
    Route::put('catalog', [CatalogController::class, 'update']);
});
