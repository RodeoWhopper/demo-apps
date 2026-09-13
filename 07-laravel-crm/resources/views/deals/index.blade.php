@extends('layouts.app')
@section('title', 'Deals')
@section('content')
<div class="flex items-center justify-between gap-4 mb-6">
    <h1 class="text-2xl font-bold text-halka-900">Deals <span class="text-base font-normal text-stone-400">({{ $deals->total() }})</span></h1>
    <a href="{{ route('deals.create') }}" class="rounded-md bg-coral-500 text-white px-4 py-2 text-sm font-medium hover:bg-coral-600">+ New deal</a>
</div>
<div class="flex gap-2 mb-4 text-sm">
    <a href="{{ route('deals.index') }}" class="rounded-full px-3 py-1 border {{ $stage === null ? 'bg-halka-700 text-white border-halka-700' : 'bg-white border-stone-300 hover:bg-stone-100' }}">All</a>
    @foreach ($stages as $s)
        <a href="{{ route('deals.index', ['stage' => $s->value]) }}" class="rounded-full px-3 py-1 border {{ $stage === $s ? 'bg-halka-700 text-white border-halka-700' : 'bg-white border-stone-300 hover:bg-stone-100' }}">{{ $s->label() }}</a>
    @endforeach
</div>
<div class="bg-white rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
    <table class="w-full text-sm">
        <thead class="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
            <tr><th class="text-left px-5 py-3">Deal</th><th class="text-left px-5 py-3">Contact</th><th class="text-left px-5 py-3">Stage</th><th class="text-right px-5 py-3">Value</th><th class="text-left px-5 py-3">Close</th><th class="text-left px-5 py-3">Owner</th></tr>
        </thead>
        <tbody class="divide-y divide-stone-100">
            @forelse ($deals as $deal)
                <tr class="hover:bg-stone-50">
                    <td class="px-5 py-3"><a href="{{ route('deals.show', $deal) }}" class="font-medium hover:underline">{{ $deal->title }}</a></td>
                    <td class="px-5 py-3"><a href="{{ route('contacts.show', $deal->contact) }}" class="hover:underline">{{ $deal->contact->name }}</a></td>
                    <td class="px-5 py-3">@include('partials.stage-badge', ['stage' => $deal->stage])</td>
                    <td class="px-5 py-3 text-right tabular-nums">${{ number_format($deal->value, 2) }}</td>
                    <td class="px-5 py-3 text-stone-600">{{ $deal->expected_close_at?->format('M j, Y') ?? '—' }}</td>
                    <td class="px-5 py-3 text-stone-600">{{ $deal->owner?->name ?? '—' }}</td>
                </tr>
            @empty
                <tr><td colspan="6" class="px-5 py-8 text-center text-stone-500">No deals in this stage.</td></tr>
            @endforelse
        </tbody>
    </table>
</div>
<div class="mt-4">{{ $deals->links() }}</div>
@endsection
