<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * The slot was taken.
 *
 * 409 rather than 422: the request was well-formed and would have been valid a
 * moment earlier. The client turns this into ConflictError — see
 * src/data/api/repository.js — so no screen ever reads a status code to decide
 * what to tell an operator.
 */
class BookingConflict extends Exception
{
    public function __construct(string $message = 'That time is no longer available.')
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'error' => 'conflict',
            'message' => $this->getMessage(),
        ], 409);
    }
}
