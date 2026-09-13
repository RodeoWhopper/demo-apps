<?php

namespace App\Http\Controllers;

use App\Enums\DealStage;
use App\Models\Contact;
use App\Models\Deal;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function __invoke(): View
    {
        $byStage = Deal::query()
            ->selectRaw('stage, COUNT(*) AS deals, COALESCE(SUM(value), 0) AS total')
            ->groupBy('stage')
            ->get()
            ->keyBy('stage');

        $pipeline = collect(DealStage::cases())->map(fn (DealStage $stage) => [
            'stage' => $stage,
            'deals' => (int) ($byStage[$stage->value]->deals ?? 0),
            'total' => (float) ($byStage[$stage->value]->total ?? 0),
        ]);

        return view('dashboard', [
            'pipeline' => $pipeline,
            'openValue' => (float) Deal::query()->whereIn('stage', [DealStage::Lead, DealStage::Qualified])->sum('value'),
            'wonValue' => (float) Deal::query()->where('stage', DealStage::Won)->sum('value'),
            'contactCount' => Contact::query()->count(),
            'dealCount' => Deal::query()->count(),
            'recentDeals' => Deal::query()->with('contact')->latest()->limit(6)->get(),
            'closingSoon' => Deal::query()->with('contact')
                ->whereIn('stage', [DealStage::Lead, DealStage::Qualified])
                ->whereNotNull('expected_close_at')
                ->orderBy('expected_close_at')
                ->limit(5)->get(),
        ]);
    }
}
