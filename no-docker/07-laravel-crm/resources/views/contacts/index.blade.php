@extends('layouts.app')
@section('title', 'Contacts')
@section('content')
<div class="flex items-center justify-between gap-4 mb-6">
    <h1 class="text-2xl font-bold text-halka-900">Contacts <span class="text-base font-normal text-stone-400">({{ $contacts->total() }})</span></h1>
    <div class="flex items-center gap-2">
        <form method="GET" action="{{ route('contacts.index') }}" class="flex gap-2">
            <input name="q" value="{{ $q }}" placeholder="Search name, email, company" class="w-64 rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-halka-400">
            <button class="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm hover:bg-stone-100">Search</button>
        </form>
        <a href="{{ route('contacts.create') }}" class="rounded-md bg-coral-500 text-white px-4 py-2 text-sm font-medium hover:bg-coral-600">+ New contact</a>
    </div>
</div>
<div class="bg-white rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
    <table class="w-full text-sm">
        <thead class="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
            <tr><th class="text-left px-5 py-3">Name</th><th class="text-left px-5 py-3">Company</th><th class="text-left px-5 py-3">Email</th><th class="text-left px-5 py-3">Owner</th><th class="text-right px-5 py-3">Deals</th></tr>
        </thead>
        <tbody class="divide-y divide-stone-100">
            @forelse ($contacts as $contact)
                <tr class="hover:bg-stone-50">
                    <td class="px-5 py-3"><a href="{{ route('contacts.show', $contact) }}" class="font-medium hover:underline">{{ $contact->name }}</a><div class="text-xs text-stone-400">{{ $contact->title }}</div></td>
                    <td class="px-5 py-3">{{ $contact->company }}</td>
                    <td class="px-5 py-3 text-stone-600">{{ $contact->email }}</td>
                    <td class="px-5 py-3 text-stone-600">{{ $contact->owner?->name ?? '—' }}</td>
                    <td class="px-5 py-3 text-right tabular-nums">{{ $contact->deals_count }}</td>
                </tr>
            @empty
                <tr><td colspan="5" class="px-5 py-8 text-center text-stone-500">No contacts match.</td></tr>
            @endforelse
        </tbody>
    </table>
</div>
<div class="mt-4">{{ $contacts->links() }}</div>
@endsection
