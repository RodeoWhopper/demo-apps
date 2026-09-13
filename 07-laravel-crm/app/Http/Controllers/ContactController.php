<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactRequest;
use App\Models\Contact;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ContactController extends Controller
{
    public function index(Request $request): View
    {
        $contacts = Contact::query()
            ->with('owner')
            ->withCount('deals')
            ->search($request->string('q')->toString())
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return view('contacts.index', ['contacts' => $contacts, 'q' => $request->string('q')->toString()]);
    }

    public function create(): View
    {
        return view('contacts.create', ['contact' => new Contact]);
    }

    public function store(ContactRequest $request): RedirectResponse
    {
        $contact = Contact::create($request->validated() + ['owner_id' => $request->user()->id]);

        return redirect()->route('contacts.show', $contact)->with('status', "Contact {$contact->name} created.");
    }

    public function show(Contact $contact): View
    {
        $contact->load(['owner', 'deals' => fn ($q) => $q->latest()]);

        return view('contacts.show', ['contact' => $contact]);
    }

    public function edit(Contact $contact): View
    {
        return view('contacts.edit', ['contact' => $contact]);
    }

    public function update(ContactRequest $request, Contact $contact): RedirectResponse
    {
        $contact->update($request->validated());

        return redirect()->route('contacts.show', $contact)->with('status', 'Contact updated.');
    }

    public function destroy(Contact $contact): RedirectResponse
    {
        $contact->delete();

        return redirect()->route('contacts.index')->with('status', "Contact {$contact->name} and its deals were deleted.");
    }
}
