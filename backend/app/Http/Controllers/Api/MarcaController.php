<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Marca;
use Illuminate\Http\JsonResponse;

class MarcaController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Marca::orderBy('nombre')->get());
    }
}
