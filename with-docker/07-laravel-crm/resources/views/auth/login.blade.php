@extends('layouts.app')
@section('title', 'Sign in')
@section('content')
@php($skipErrorSummary = true)
<div class="max-w-sm mx-auto mt-10">
    <div class="text-center mb-6">
        <span class="inline-block h-12 w-12 rounded-full border-[9px] border-coral-500"></span>
        <h1 class="mt-3 text-2xl font-bold text-halka-900">Sign in to Halka CRM</h1>
        <p class="text-sm text-stone-500">Contacts and deals, in one ring.</p>
    </div>
    <form method="POST" action="{{ route('login.store') }}" class="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-4">
        @csrf
        <div>
            <label for="email" class="block text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" value="{{ old('email') }}" required autofocus autocomplete="username"
                   class="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-halka-400 @error('email') border-rose-400 @enderror">
            @error('email')<p class="mt-1 text-xs text-rose-700">{{ $message }}</p>@enderror
        </div>
        <div>
            <label for="password" class="block text-sm font-medium">Password</label>
            <input id="password" name="password" type="password" required autocomplete="current-password"
                   class="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-halka-400">
        </div>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="remember" value="1" class="rounded"> Remember me</label>
        <button class="w-full rounded-md bg-halka-700 text-white font-medium py-2 hover:bg-halka-800">Sign in</button>
        <p class="text-xs text-stone-500 text-center">Demo: <code>admin@halka.dev / Admin123!</code> · <code>rep@halka.dev / Rep123!</code></p>
    </form>
</div>
@endsection
