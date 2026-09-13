<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/** Admin-only (see the `admin` middleware alias). */
class UserController extends Controller
{
    public function index(): View
    {
        return view('admin.users.index', [
            'users' => User::query()->withCount(['contacts', 'deals'])->orderBy('name')->get(),
        ]);
    }

    /** Toggle a user between the `admin` and `rep` roles. */
    public function toggleRole(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            return redirect()->route('admin.users.index')->withErrors(['role' => 'You cannot change your own role.']);
        }

        $user->role = $user->isAdmin() ? User::ROLE_REP : User::ROLE_ADMIN;
        $user->save();

        return redirect()->route('admin.users.index')->with('status', "{$user->name} is now {$user->role}.");
    }
}
