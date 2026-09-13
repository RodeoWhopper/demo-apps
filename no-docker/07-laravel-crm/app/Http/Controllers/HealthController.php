<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/** JSON health probe; the route bypasses the `web` middleware group (no session/cookies). */
class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            DB::select('select 1');
            $db = 'ok';
        } catch (\Throwable) {
            $db = 'error';
        }

        return response()->json([
            'status' => $db === 'ok' ? 'ok' : 'degraded',
            'app' => 'halka-crm',
            'db' => $db,
            'laravel' => app()->version(),
            'php' => PHP_VERSION,
            'time' => now()->toIso8601String(),
        ], $db === 'ok' ? 200 : 503);
    }
}
