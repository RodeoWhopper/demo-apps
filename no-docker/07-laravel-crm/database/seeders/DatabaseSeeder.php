<?php

namespace Database\Seeders;

use App\Models\Contact;
use App\Models\Deal;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Eloquent\Factories\Sequence;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Idempotent: `migrate --seed` can safely be run more than once;
     * nothing happens once a user exists.
     */
    public function run(): void
    {
        if (User::query()->exists()) {
            $this->command?->info('Halka CRM: database already seeded, skipping.');

            return;
        }

        $admin = User::factory()->admin()->create([
            'name' => 'Ada Admin',
            'email' => 'admin@halka.dev',
            'password' => 'Admin123!',
        ]);
        $rep = User::factory()->create([
            'name' => 'Rae Rep',
            'email' => 'rep@halka.dev',
            'password' => 'Rep123!',
        ]);

        $contacts = Contact::factory()
            ->count(20)
            ->state(new Sequence(['owner_id' => $admin->id], ['owner_id' => $rep->id]))
            ->create();

        Deal::factory()
            ->count(15)
            ->recycle($contacts)
            ->state(new Sequence(['owner_id' => $rep->id], ['owner_id' => $rep->id], ['owner_id' => $admin->id]))
            ->create();

        $this->command?->info('Halka CRM: seeded 2 users, 20 contacts, 15 deals.');
    }
}
