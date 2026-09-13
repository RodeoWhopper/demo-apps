@extends('layouts.app')
@section('title', $contact->name)
@section('content')
<div class="flex items-start justify-between gap-4 mb-6">
    <div>
        <p class="text-sm"><a href="{{ route('contacts.index') }}" class="text-halka-700 hover:underline">← Contacts</a></p>
        <h1 class="text-2xl font-bold text-halka-900">{{ $contact->name }}</h1>
        <p class="text-stone-500">{{ $contact->title }}{{ $contact->title && $contact->company ? ' · ' : '' }}{{ $contact->company }}</p>
    </div>
    <div class="flex items-center gap-2">
        <a href="{{ route('deals.create', ['contact_id' => $contact->id]) }}" class="rounded-md bg-coral-500 text-white px-3 py-2 text-sm font-medium hover:bg-coral-600">+ Deal</a>
        <a href="{{ route('contacts.edit', $contact) }}" class="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm hover:bg-stone-100">Edit</a>
        <form method="POST" action="{{ route('contacts.destroy', $contact) }}" onsubmit="return confirm('Delete this contact and all of its deals?')">
            @csrf @method('DELETE')
            <button class="rounded-md border border-rose-200 bg-white text-rose-700 px-3 py-2 text-sm hover:bg-rose-50">Delete</button>
        </form>
    </div>
</div>
<div class="grid lg:grid-cols-3 gap-6">
    <aside class="bg-white rounded-xl border border-stone-200 shadow-sm p-5 text-sm space-y-3">
        <div><div class="text-xs uppercase tracking-wider text-stone-400">Email</div><a href="mailto:{{ $contact->email }}" class="text-halka-700 hover:underline">{{ $contact->email }}</a></div>
        <div><div class="text-xs uppercase tracking-wider text-stone-400">Phone</div>{{ $contact->phone ?: '—' }}</div>
        <div><div class="text-xs uppercase tracking-wider text-stone-400">Owner</div>{{ $contact->owner?->name ?? '—' }}</div>
        <div><div class="text-xs uppercase tracking-wider text-stone-400">Notes</div><p class="whitespace-pre-line">{{ $contact->notes ?: '—' }}</p></div>
        <div class="text-xs text-stone-400">Created {{ $contact->created_at->diffForHumans() }}</div>
    </aside>
    <section class="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-sm">
        <div class="px-5 py-4 border-b border-stone-100"><h2 class="font-semibold">Deals ({{ $contact->deals->count() }})</h2></div>
        <ul class="divide-y divide-stone-100">
            @forelse ($contact->deals as $deal)
                <li class="px-5 py-3 flex items-center justify-between text-sm">
                    <a href="{{ route('deals.show', $deal) }}" class="font-medium hover:underline">{{ $deal->title }}</a>
                    <div class="flex items-center gap-3">@include('partials.stage-badge', ['stage' => $deal->stage])<span class="tabular-nums">${{ number_format($deal->value, 2) }}</span></div>
                </li>
            @empty
                <li class="px-5 py-6 text-sm text-stone-500">No deals yet.</li>
            @endforelse
        </ul>
    </section>
</div>
@endsection
