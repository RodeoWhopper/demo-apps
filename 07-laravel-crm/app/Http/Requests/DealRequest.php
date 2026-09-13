<?php

namespace App\Http\Requests;

use App\Enums\DealStage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DealRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:160'],
            'contact_id' => ['required', 'integer', Rule::exists('contacts', 'id')],
            'stage' => ['required', Rule::enum(DealStage::class)],
            'value' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'expected_close_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
