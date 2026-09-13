<?php

namespace App\Http\Controllers;

use App\Enums\DealStage;
use App\Http\Requests\DealRequest;
use App\Models\Contact;
use App\Models\Deal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DealController extends Controller
{
    public function index(Request $request): View
    {
        $stage = DealStage::tryFrom($request->string('stage')->toString());

        $deals = Deal::query()
            ->with(['contact', 'owner'])
            ->when($stage, fn ($q) => $q->where('stage', $stage))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return view('deals.index', ['deals' => $deals, 'stage' => $stage, 'stages' => DealStage::cases()]);
    }

    public function create(Request $request): View
    {
        $deal = new Deal(['stage' => DealStage::Lead, 'contact_id' => $request->integer('contact_id') ?: null]);

        return view('deals.create', ['deal' => $deal] + $this->formData());
    }

    public function store(DealRequest $request): RedirectResponse
    {
        $deal = Deal::create($request->validated() + ['owner_id' => $request->user()->id]);

        return redirect()->route('deals.show', $deal)->with('status', "Deal \"{$deal->title}\" created.");
    }

    public function show(Deal $deal): View
    {
        $deal->load(['contact', 'owner']);

        return view('deals.show', ['deal' => $deal]);
    }

    public function edit(Deal $deal): View
    {
        return view('deals.edit', ['deal' => $deal] + $this->formData());
    }

    public function update(DealRequest $request, Deal $deal): RedirectResponse
    {
        $deal->update($request->validated());

        return redirect()->route('deals.show', $deal)->with('status', 'Deal updated.');
    }

    public function destroy(Deal $deal): RedirectResponse
    {
        $deal->delete();

        return redirect()->route('deals.index')->with('status', 'Deal deleted.');
    }

    /** @return array{contacts: \Illuminate\Support\Collection, stages: array} */
    private function formData(): array
    {
        return [
            'contacts' => Contact::query()->orderBy('name')->get(['id', 'name', 'company']),
            'stages' => DealStage::cases(),
        ];
    }
}
