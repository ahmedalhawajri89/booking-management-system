<?php

return [
    /*
    |-----------------------------------------------------------------------
    | Who may call this API from a browser.
    |
    | The frontend is a separate origin — Vite in development, a static host
    | in production — so without this every request from it fails before it
    | reaches a route. `allowed_origins` is a list rather than '*' on purpose:
    | the API issues bearer tokens, and a wildcard invites any page on the
    | internet to make authenticated calls with a token it manages to obtain.
    |
    | Add the deployed frontend origin here; do not replace the list with '*'.
    |-----------------------------------------------------------------------
    */

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // False, and it must stay false: the token travels in an Authorization
    // header, not a cookie. Turning this on would be the first half of a CSRF
    // hole and would buy nothing.
    'supports_credentials' => false,
];
