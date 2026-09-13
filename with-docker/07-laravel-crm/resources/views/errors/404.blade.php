@extends('layouts.app')
@section('title', 'Not found')
@section('content')
<div class="max-w-md mx-auto mt-12 text-center bg-white rounded-xl border border-stone-200 shadow-sm p-10">
    <div class="text-6xl font-black text-stone-200">404</div>
    <h1 class="mt-2 text-xl font-semibold">Page not found</h1>
    <a href="{{ route('dashboard') }}" class="inline-block mt-6 text-sm text-halka-700 underline">Back to dashboard</a>
</div>
@endsection
