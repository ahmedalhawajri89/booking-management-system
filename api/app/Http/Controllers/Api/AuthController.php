<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        // One message and one code for both "no such address" and "wrong
        // password". Distinguishing them turns the login form into an oracle
        // for which addresses have accounts here.
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        // Every sign-in mints a fresh token and the client stores only that.
        // Nothing about the role travels with it: /auth/me re-reads the row,
        // so revoking operator access takes effect on the next request rather
        // than whenever the client happens to sign in again.
        return response()->json([
            'token' => $user->createToken('web')->plainTextToken,
            'user' => $user->toSession(),
        ]);
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'fullName' => ['required', 'string', 'min:2', 'max:255'],
        ]);

        // A new account is a customer. `role` is not in $fillable and is not
        // set here: operator access is granted server-side, never claimed at
        // sign-up, so there is no request this endpoint could receive that
        // would produce one.
        $user = new User();
        $user->fill([
            'name' => $data['fullName'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);
        $user->org_id = Organization::query()->value('id');
        $user->save();

        // No token in the response, deliberately: registering creates the
        // account and nothing else, so signing in stays one explicit step.
        return response()->json(['user' => $user->toSession()], 201);
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $request->user()->toSession()]);
    }

    public function logout(Request $request)
    {
        // This token only. Signing out of a laptop should not sign you out of
        // a phone.
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }
}
