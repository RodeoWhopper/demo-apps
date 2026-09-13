@extends('layouts.app')
@section('title', 'New contact')
@section('content')
<h1 class="text-2xl font-bold text-halka-900 mb-6">New contact</h1>
<form method="POST" action="{{ route('contacts.store') }}" class="max-w-2xl bg-white rounded-xl border border-stone-200 shadow-sm p-6">
    @include('contacts._form', ['submit' => 'Create contact'])
</form>
@endsection
