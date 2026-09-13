<?php

namespace Database\Factories;

use App\Enums\DealStage;
use App\Models\Contact;
use App\Models\Deal;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Deal>
 */
class DealFactory extends Factory
{
    public function definition(): array
    {
        $products = ['Annual licence', 'Onboarding package', 'Support retainer', 'Pilot project', 'Enterprise rollout', 'Training workshop'];

        return [
            'contact_id' => Contact::factory(),
            'title' => fake()->randomElement($products).' - '.fake()->bs(),
            'stage' => fake()->randomElement(DealStage::cases()),
            'value' => fake()->randomFloat(2, 500, 60000),
            'expected_close_at' => fake()->optional(0.7)->dateTimeBetween('now', '+120 days'),
            'notes' => fake()->optional(0.3)->sentence(10),
        ];
    }
}
