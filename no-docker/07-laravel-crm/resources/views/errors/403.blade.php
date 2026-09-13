@extends('layouts.app')
@section('title', 'Forbidden')
@section('content')
<div class="max-w-md mx-auto mt-12 text-center bg-white rounded-xl border border-stone-200 shadow-sm p-10">
    <div class="text-6xl font-black text-stone-200">403</div>
    <h1 class="mt-2 text-xl font-semibold">Not allowed</h1>
    <p class="mt-2 text-sm text-stone-500">{{ $exception->getMessage() ?: 'You do not have permission to view this page.' }}</p>
    <a href="{{ route('dashboard') }}" class="inline-block mt-6 text-sm text-halka-700 underline">Back to dashboard</a>
</div>
@endsection
