<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * The operator console, in one line.
 *
 * This is what replaced the Row Level Security policies. Postgres checked the
 * role on every row of every query, which meant a forgotten WHERE clause was
 * still safe. Here the check happens once, at the edge, so the controllers
 * behind it are trusted — and the price of that is that a route left off this
 * middleware is a route with no protection at all. Which routes carry it is
 * therefore a security decision, and it lives in routes/api.php where the
 * whole surface can be read in one screen.
 */
class EnsureOperator
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->user()?->isOperator()) {
            return response()->json(['error' => 'forbidden'], 403);
        }

        return $next($request);
    }
}
