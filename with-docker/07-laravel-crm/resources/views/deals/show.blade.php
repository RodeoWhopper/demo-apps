@extends('layouts.app')
@section('title', $deal->title)
@section('content')
<div class="flex items-start justify-between gap-4 mb-6">
    <div>
        <p class="text-sm"><a href="{{ route('deals.index') }}" class="text-halka-700 hover:underline">← Deals</a></p>
        <h1 class="text-2xl font-bold text-halka-900">{{ $deal->title }}</h1>
        <div class="mt-1 flex items-center gap-3">@include('partials.stage-badge', ['stage' => $deal->stage])<span class="text-xl font-semibold tabular-nums">${{ number_format($deal->value, 2) }}</span></div>
    </div>
    <div class="flex items-center gap-2">
        <a href="{{ route('deals.edit', $deal) }}" class="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm hover:bg-stone-100">Edit</a>
        <form method="POST" action="{{ route('deals.destroy', $deal) }}" onsubmit="return confirm('Delete this deal?')">
            @csrf @method('DELETE')
            <button class="rounded-md border border-rose-200 bg-white text-rose-700 px-3 py-2 text-sm hover:bg-rose-50">Delete</button>
        </form>
    </div>
</div>
<div class="max-w-2xl bg-white rounded-xl border border-stone-200 shadow-sm p-5 text-sm grid sm:grid-cols-2 gap-4">
    <div><div class="text-xs uppercase tracking-wider text-stone-400">Contact</div><a href="{{ route('contacts.show', $deal->contact) }}" class="text-halka-700 hover:underline">{{ $deal->contact->name }}</a><div class="text-stone-500">{{ $deal->contact->company }}</div></div>
    <div><div class="text-xs uppercase tracking-wider text-stone-400">Owner</div>{{ $deal->owner?->name ?? '—' }}</div>
    <div><div class="text-xs uppercase tracking-wider text-stone-400">Expected close</div>{{ $deal->expected_close_at?->format('F j, Y') ?? '—' }}</div>
    <div><div class="text-xs uppercase tracking-wider text-stone-400">Updated</div>{{ $deal->updated_at->diffForHumans() }}</div>
    <div class="sm:col-span-2"><div class="text-xs uppercase tracking-wider text-stone-400">Notes</div><p class="whitespace-pre-line">{{ $deal->notes ?: '—' }}</p></div>
</div>
@endsection
