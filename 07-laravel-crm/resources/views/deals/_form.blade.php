@csrf
@php($field = fn (string $name) => 'mt-1 w-full rounded-md border px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-halka-400 '.($errors->has($name) ? 'border-rose-400' : 'border-stone-300'))
<div class="grid sm:grid-cols-2 gap-4">
    <div class="sm:col-span-2">
        <label class="block text-sm font-medium" for="title">Title *</label>
        <input id="title" name="title" value="{{ old('title', $deal->title) }}" required class="{{ $field('title') }}">
        @error('title')<p class="mt-1 text-xs text-rose-700">{{ $message }}</p>@enderror
    </div>
    <div class="sm:col-span-2">
        <label class="block text-sm font-medium" for="contact_id">Contact *</label>
        <select id="contact_id" name="contact_id" required class="{{ $field('contact_id') }}">
            <option value="">— choose —</option>
            @foreach ($contacts as $c)
                <option value="{{ $c->id }}" @selected((int) old('contact_id', $deal->contact_id) === $c->id)>{{ $c->name }}{{ $c->company ? ' · '.$c->company : '' }}</option>
            @endforeach
        </select>
        @error('contact_id')<p class="mt-1 text-xs text-rose-700">{{ $message }}</p>@enderror
    </div>
    <div>
        <label class="block text-sm font-medium" for="stage">Stage *</label>
        <select id="stage" name="stage" class="{{ $field('stage') }}">
            @foreach ($stages as $s)
                <option value="{{ $s->value }}" @selected(old('stage', $deal->stage?->value) === $s->value)>{{ $s->label() }}</option>
            @endforeach
        </select>
    </div>
    <div>
        <label class="block text-sm font-medium" for="value">Value (USD) *</label>
        <input id="value" name="value" type="number" step="0.01" min="0" value="{{ old('value', $deal->value) }}" required class="{{ $field('value') }}">
        @error('value')<p class="mt-1 text-xs text-rose-700">{{ $message }}</p>@enderror
    </div>
    <div>
        <label class="block text-sm font-medium" for="expected_close_at">Expected close</label>
        <input id="expected_close_at" name="expected_close_at" type="date" value="{{ old('expected_close_at', $deal->expected_close_at?->format('Y-m-d')) }}" class="{{ $field('expected_close_at') }}">
    </div>
    <div class="sm:col-span-2">
        <label class="block text-sm font-medium" for="notes">Notes</label>
        <textarea id="notes" name="notes" rows="3" class="{{ $field('notes') }}">{{ old('notes', $deal->notes) }}</textarea>
    </div>
</div>
<div class="mt-6 flex items-center gap-3">
    <button class="rounded-md bg-halka-700 text-white px-4 py-2 text-sm font-medium hover:bg-halka-800">{{ $submit }}</button>
    <a href="{{ $deal->exists ? route('deals.show', $deal) : route('deals.index') }}" class="text-sm text-stone-600 hover:underline">Cancel</a>
</div>
