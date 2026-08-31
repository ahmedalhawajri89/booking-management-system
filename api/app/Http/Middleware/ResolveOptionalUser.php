<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Authenticate if a token is present; carry on if not.
 *
 * `auth:sanctum` answers "may you ask at all" with a 401. Several reads here
 * need the other question — "what may you see" — because the policies they
 * replace answered it with a narrower result set rather than a refusal. The
 * booking wizard calls /bookings before anyone has signed in and needs slots,
 * not an error state.
 *
 * This resolves the user when a valid token arrives and leaves the request
 * anonymous otherwise, so a controller can branch on `$request->user()` the
 * way a policy branched on `auth.uid()`.
 */
class ResolveOptionalUser
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->user()) {
            $user = Auth::guard('sanctum')->user();
            if ($user) {
                $request->setUserResolver(fn () => $user);
            }
        }

        return $next($request);
    }
}
