@csrf
@php($field = fn (string $name) => 'mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-halka-400 '.($errors->has($name) ? 'border-rose-400' : 'border-stone-300'))
<div class="grid sm:grid-cols-2 gap-4">
    <div class="sm:col-span-2">
        <label class="block text-sm font-medium" for="name">Name *</label>
        <input id="name" name="name" value="{{ old('name', $contact->name) }}" required class="{{ $field('name') }}">
        @error('name')<p class="mt-1 text-xs text-rose-700">{{ $message }}</p>@enderror
    </div>
    <div>
        <label class="block text-sm font-medium" for="email">Email *</label>
        <input id="email" name="email" type="email" value="{{ old('email', $contact->email) }}" required class="{{ $field('email') }}">
        @error('email')<p class="mt-1 text-xs text-rose-700">{{ $message }}</p>@enderror
    </div>
    <div>
        <label class="block text-sm font-medium" for="phone">Phone</label>
        <input id="phone" name="phone" value="{{ old('phone', $contact->phone) }}" class="{{ $field('phone') }}">
    </div>
    <div>
        <label class="block text-sm font-medium" for="company">Company</label>
        <input id="company" name="company" value="{{ old('company', $contact->company) }}" class="{{ $field('company') }}">
    </div>
    <div>
        <label class="block text-sm font-medium" for="title">Job title</label>
        <input id="title" name="title" value="{{ old('title', $contact->title) }}" class="{{ $field('title') }}">
    </div>
    <div class="sm:col-span-2">
        <label class="block text-sm font-medium" for="notes">Notes</label>
        <textarea id="notes" name="notes" rows="4" class="{{ $field('notes') }}">{{ old('notes', $contact->notes) }}</textarea>
    </div>
</div>
<div class="mt-6 flex items-center gap-3">
    <button class="rounded-md bg-halka-700 text-white px-4 py-2 text-sm font-medium hover:bg-halka-800">{{ $submit }}</button>
    <a href="{{ $contact->exists ? route('contacts.show', $contact) : route('contacts.index') }}" class="text-sm text-stone-600 hover:underline">Cancel</a>
</div>
