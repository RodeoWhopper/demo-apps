<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Halka CRM') · Halka CRM</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = { theme: { extend: { colors: {
            halka: { 50: '#effcfa', 100: '#c8f5ee', 200: '#93ebdf', 300: '#57d9c9', 400: '#26bfaf', 500: '#0fa394', 600: '#0b8378', 700: '#0d6961', 800: '#0f544f', 900: '#114642' },
            coral: { 400: '#ff8e72', 500: '#f4694b', 600: '#d94f32' }
        }}}}
    </script>
</head>
<body class="h-full bg-stone-50 text-stone-800 antialiased">
<div class="min-h-full flex flex-col">
    <nav class="bg-halka-800 text-halka-50">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div class="flex items-center gap-8">
                <a href="{{ route('dashboard') }}" class="flex items-center gap-2 font-bold tracking-tight text-white">
                    <span class="inline-block h-6 w-6 rounded-full border-[5px] border-coral-400"></span>
                    Halka CRM
                </a>
                @auth
                <div class="hidden sm:flex items-center gap-1 text-sm">
                    @foreach ([['dashboard', 'Dashboard'], ['contacts.index', 'Contacts'], ['deals.index', 'Deals']] as [$route, $label])
                        <a href="{{ route($route) }}" class="px-3 py-1.5 rounded-md {{ request()->routeIs(str_replace('.index', '.*', $route)) ? 'bg-halka-700 text-white' : 'text-halka-100 hover:bg-halka-700/60' }}">{{ $label }}</a>
                    @endforeach
                    @if (auth()->user()->isAdmin())
                        <a href="{{ route('admin.users.index') }}" class="px-3 py-1.5 rounded-md {{ request()->routeIs('admin.*') ? 'bg-halka-700 text-white' : 'text-halka-100 hover:bg-halka-700/60' }}">Users</a>
                    @endif
                </div>
                @endauth
            </div>
            @auth
            <div class="flex items-center gap-3 text-sm">
                <span class="text-halka-100">{{ auth()->user()->name }}
                    <span class="ml-1 rounded-full bg-halka-600 px-2 py-0.5 text-xs uppercase tracking-wider">{{ auth()->user()->role }}</span>
                </span>
                <form method="POST" action="{{ route('logout') }}">
                    @csrf
                    <button class="rounded-md bg-halka-700 px-3 py-1.5 hover:bg-halka-600">Sign out</button>
                </form>
            </div>
            @endauth
        </div>
    </nav>

    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        @if (session('status'))
            <div class="mb-6 rounded-lg border border-halka-200 bg-halka-50 px-4 py-3 text-sm text-halka-800">{{ session('status') }}</div>
        @endif
        @if ($errors->any() && ! isset($skipErrorSummary))
            <div class="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <ul class="list-disc pl-5 space-y-0.5">
                    @foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach
                </ul>
            </div>
        @endif
        @yield('content')
    </main>

    <footer class="py-6 text-center text-xs text-stone-400">Halka CRM · Laravel {{ app()->version() }} demo</footer>
</div>
</body>
</html>
