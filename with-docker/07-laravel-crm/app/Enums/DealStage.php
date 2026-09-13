<?php

namespace App\Enums;

enum DealStage: string
{
    case Lead = 'lead';
    case Qualified = 'qualified';
    case Won = 'won';
    case Lost = 'lost';

    public function label(): string
    {
        return ucfirst($this->value);
    }

    /** Tailwind classes for the stage badge. */
    public function badgeClass(): string
    {
        return match ($this) {
            self::Lead => 'bg-sky-100 text-sky-800',
            self::Qualified => 'bg-violet-100 text-violet-800',
            self::Won => 'bg-emerald-100 text-emerald-800',
            self::Lost => 'bg-rose-100 text-rose-800',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
