@extends('layouts.app')
@section('title', 'Users')
@section('content')
<h1 class="text-2xl font-bold text-halka-900 mb-1">Users</h1>
<p class="text-sm text-stone-500 mb-6">Admin only. Toggle a colleague between <code>rep</code> and <code>admin</code>.</p>
<div class="bg-white rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
    <table class="w-full text-sm">
        <thead class="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
            <tr><th class="text-left px-5 py-3">Name</th><th class="text-left px-5 py-3">Email</th><th class="text-left px-5 py-3">Role</th><th class="text-right px-5 py-3">Contacts</th><th class="text-right px-5 py-3">Deals</th><th></th></tr>
        </thead>
        <tbody class="divide-y divide-stone-100">
            @foreach ($users as $user)
                <tr>
                    <td class="px-5 py-3 font-medium">{{ $user->name }}</td>
                    <td class="px-5 py-3 text-stone-600">{{ $user->email }}</td>
                    <td class="px-5 py-3"><span class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold {{ $user->isAdmin() ? 'bg-coral-500/15 text-coral-600' : 'bg-halka-100 text-halka-800' }}">{{ $user->role }}</span></td>
                    <td class="px-5 py-3 text-right tabular-nums">{{ $user->contacts_count }}</td>
                    <td class="px-5 py-3 text-right tabular-nums">{{ $user->deals_count }}</td>
                    <td class="px-5 py-3 text-right">
                        @if ($user->is(auth()->user()))
                            <span class="text-xs text-stone-400">you</span>
                        @else
                            <form method="POST" action="{{ route('admin.users.role', $user) }}">
                                @csrf @method('PATCH')
                                <button class="text-halka-700 hover:underline">Make {{ $user->isAdmin() ? 'rep' : 'admin' }}</button>
                            </form>
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endsection
