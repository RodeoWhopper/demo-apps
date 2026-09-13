<?php

namespace Database\Factories;

use App\Models\Contact;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Contact>
 */
class ContactFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->optional(0.8)->e164PhoneNumber(),
            'company' => fake()->company(),
            'title' => fake()->jobTitle(),
            'notes' => fake()->optional(0.4)->sentence(12),
        ];
    }
}
