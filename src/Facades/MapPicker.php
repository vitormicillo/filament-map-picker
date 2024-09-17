<?php

declare(strict_types=1);

namespace Doode\MapPicker\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @see \Doode\MapPicker\MapPicker
 */
class MapPicker extends Facade
{
    protected static function getFacadeAccessor()
    {
        return \Doode\MapPicker\MapPicker::class;
    }
}
