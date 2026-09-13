@extends('layouts.app')
@section('title', 'Dashboard')
@section('content')
<div class="flex items-end justify-between mb-6">
    <div>
        <h1 class="text-2xl font-bold text-halka-900">Pipeline</h1>
        <p class="text-sm text-stone-500">{{ $dealCount }} deals across {{ $contactCount }} contacts</p>
    </div>
    <a href="{{ route('deals.create') }}" class="rounded-md bg-coral-500 text-white px-4 py-2 text-sm font-medium hover:bg-coral-600">+ New deal</a>
</div>

<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    @foreach ($pipeline as $row)
        <div class="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            @include('partials.stage-badge', ['stage' => $row['stage']])
            <div class="mt-2 text-2xl font-bold tabular-nums">${{ number_format($row['total'], 0) }}</div>
            <div class="text-xs text-stone-500">{{ $row['deals'] }} {{ Str::plural('deal', $row['deals']) }}</div>
        </div>
    @endforeach
</div>

<div class="grid md:grid-cols-2 gap-4 mb-8">
    <div class="rounded-xl bg-halka-800 text-white p-5">
        <div class="text-xs uppercase tracking-wider text-halka-200">Open pipeline</div>
        <div class="text-3xl font-bold tabular-nums">${{ number_format($openValue, 2) }}</div>
    </div>
    <div class="rounded-xl bg-emerald-600 text-white p-5">
        <div class="text-xs uppercase tracking-wider text-emerald-100">Won</div>
        <div class="text-3xl font-bold tabular-nums">${{ number_format($wonValue, 2) }}</div>
    </div>
</div>

<div class="grid lg:grid-cols-2 gap-6">
    <section class="bg-white rounded-xl border border-stone-200 shadow-sm">
        <div class="px-5 py-4 border-b border-stone-100 flex justify-between items-center">
            <h2 class="font-semibold">Recent deals</h2>
            <a href="{{ route('deals.index') }}" class="text-sm text-halka-700 hover:underline">All deals →</a>
        </div>
        <ul class="divide-y divide-stone-100">
            @foreach ($recentDeals as $deal)
                <li class="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                    <div class="min-w-0">
                        <a href="{{ route('deals.show', $deal) }}" class="font-medium hover:underline truncate block">{{ $deal->title }}</a>
                        <span class="text-stone-500">{{ $deal->contact->name }}</span>
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                        @include('partials.stage-badge', ['stage' => $deal->stage])
                        <span class="tabular-nums">${{ number_format($deal->value, 0) }}</span>
                    </div>
                </li>
            @endforeach
        </ul>
    </section>
    <section class="bg-white rounded-xl border border-stone-200 shadow-sm">
        <div class="px-5 py-4 border-b border-stone-100"><h2 class="font-semibold">Closing soon</h2></div>
        @if ($closingSoon->isEmpty())
            <p class="px-5 py-6 text-sm text-stone-500">No open deals with a close date.</p>
        @else
        <ul class="divide-y divide-stone-100">
            @foreach ($closingSoon as $deal)
                <li class="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                    <div class="min-w-0">
                        <a href="{{ route('deals.show', $deal) }}" class="font-medium hover:underline truncate block">{{ $deal->title }}</a>
                        <span class="text-stone-500">{{ $deal->contact->company ?? $deal->contact->name }}</span>
                    </div>
                    <span class="shrink-0 text-stone-600">{{ $deal->expected_close_at->format('M j') }}</span>
                </li>
            @endforeach
        </ul>
        @endif
    </section>
</div>
@endsection
