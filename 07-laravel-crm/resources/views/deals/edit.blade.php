@extends('layouts.app')
@section('title', 'Edit deal')
@section('content')
<h1 class="text-2xl font-bold text-halka-900 mb-6">Edit deal</h1>
<form method="POST" action="{{ route('deals.update', $deal) }}" class="max-w-2xl bg-white rounded-xl border border-stone-200 shadow-sm p-6">
    @method('PUT')
    @include('deals._form', ['submit' => 'Save changes'])
</form>
@endsection
