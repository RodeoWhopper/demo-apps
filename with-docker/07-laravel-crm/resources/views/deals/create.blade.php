@extends('layouts.app')
@section('title', 'New deal')
@section('content')
<h1 class="text-2xl font-bold text-halka-900 mb-6">New deal</h1>
<form method="POST" action="{{ route('deals.store') }}" class="max-w-2xl bg-white rounded-xl border border-stone-200 shadow-sm p-6">
    @include('deals._form', ['submit' => 'Create deal'])
</form>
@endsection
