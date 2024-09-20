# Filament V3 Map Picker + Geoman Drawing Plugin

[![Latest Version on Packagist][ico-version]][link-packagist]
[![Total Downloads][ico-downloads]][link-downloads]
[![Software License][ico-license]][link-license]

![img_1.png](img_1.png)

## Introduction 

Map Picker is a custom field of Filament designed to simplify the process of selecting a location on a map and obtaining its 
geo-coordinates with the ease of having the Geoman plugin embedded in the map.

* Features include: 
   * A Field for Filament-v3 with OpenStreetMap Integration
   * Receive Real-time Coordinates Upon Marker Movement Completion
   * Tailor Controls and Marker Appearance to Your Preferences
* Latest versions of PHP and Filament
* Best practices applied:
  * [`README.md`][link-readme] (badges included)
  * [`LICENSE`][link-license]
  * [`composer.json`][link-composer-json]
  * [`.gitignore`][link-gitignore]
  * [`pint.json`][link-pint]

## Supported Maps

Map Picker currently supports the following map:

1. Open Street Map (OSM)

Additional map options will be added to the package as needed and tested.

## Installation

You can easily install the package via Composer:

```bash
composer require doode/filament-map-picker
```

## Basic Usage

Resource file:

```php
<?php
namespace App\Filament\Resources;
use Filament\Resources\Resource;
use Filament\Resources\Forms\Form;
use Doode\MapPicker\Fields\Map;
...

class FilamentResource extends Resource
{
    ...
    public static function form(Form $form)
    {
        return $form->schema([
            Map::make('location')
                ->label('Location')
                ->columnSpanFull()
                ->defaultLocation(latitude: 52.8027, longitude: -1.0546)
                ->afterStateUpdated(function (Set $set, ?array $state): void {
                    $set('latitude', $state['lat']);
                    $set('longitude', $state['lng']);
                })
                ->afterStateHydrated(function ($state, $record, Set $set): void {
                    $set('location', ['lat' => $record->latitude, 'lng' => $record->longitude]);
                })
                ->extraStyles([
                    'min-height: 150vh',
                    'border-radius: 50px'
                ])
                ->liveLocation(true, true, 10000) // Updates live location every 10 seconds
                ->showMarker()
                ->markerColor("#22c55eff")
                ->showFullscreenControl()
                ->showZoomControl()
                ->draggable()
                ->tilesUrl("https://tile.openstreetmap.de/{z}/{x}/{y}.png")
                ->zoom(15)
                ->detectRetina()
                ->showMyLocationButton()
                ->extraTileControl([])
                ->extraControl([
                    'zoomDelta'           => 1,
                    'zoomSnap'            => 2,
                ])
           ]);
    }
    ...
}
```

Other option you can use to test Geoman shapes is:
```php
<?php
namespace App\Filament\Resources;
use Filament\Resources\Resource;
use Filament\Resources\Forms\Form;
use Doode\MapPicker\Fields\Map;
...

class FilamentResource extends Resource
{
    ...
    public static function form(Form $form)
    {
        return $form->schema([
            Map::make('location')
                ->label('Location')
                ->columnSpanFull()
                ->defaultLocation(latitude: 52.8027, longitude: -1.0546)
                ->afterStateUpdated(function (Set $set, ?array $state): void {
                    if ($state) {
                        $set('coordinates', json_encode($state));
                    }
                })
                ->afterStateHydrated(function ($state, $record, Set $set): void {
                    $set('coordinates', $record?->geom);
                })
                ->extraStyles([
                    'min-height: 50vh',
                    'border-radius: 50px'
                ])
                ->liveLocation(true, true, 10000) // Updates live location every 10 seconds
                ->showMarker() //true or false
                ->markerColor("#22c55eff")
                ->showFullscreenControl() //true or false
                ->showZoomControl() //true or false
                ->draggable() //true or false
                ->tilesUrl("https://tile.openstreetmap.de/{z}/{x}/{y}.png")
                ->zoom(10)
                ->detectRetina()
                ->showMyLocationButton()
                ->extraTileControl([])
                ->extraControl([
                    'zoomDelta'           => 1,
                    'zoomSnap'            => 2,
                ]),
           
            Textarea::make('coordinates')->columnSpanFull()     
                
           ]);
           
           
    }
    ...
}
```

#### `liveLocation` Option

The `liveLocation` method accepts three parameters:

1. **`bool $send`:** Determines if the user's live location should be sent.
2. **`bool $realtime`:** Controls whether the live location should be sent to the server periodically.
3. **`int $milliseconds`:** Sets the interval (in milliseconds) at which the user's location is updated and sent to the server.

Example:

```php
Map::make('location')
    ->liveLocation(true, true, 10000)  // Updates live location every 10 seconds
    ->showMarker()
    ->draggable()
```

If you wish to update the map location and marker either through an action or after altering other input values, you can trigger a refresh of the map using the following approach:

```php

use Filament\Forms\Components\Actions\Action;
use Filament\Forms\Components\Actions;
use Filament\Support\Enums\VerticalAlignment;

Actions::make([
    Action::make('Set Default Location')
        ->icon('heroicon-m-map-pin')
        ->action(function (Set $set, $state, $livewire): void {
            $set('location', ['lat' => '52.8027', 'lng' => '-1.0546']);
            $set('latitude', '52.8027');
            $set('longitude', '-1.0546');
            $livewire->dispatch('refreshMap');
        })
])->verticalAlignment(VerticalAlignment::Start);

```

### Usage As Infolist Field

The MapEntry Infolist field displays a map.

```php
use Doode\MapPicker\Infolists\MapEntry;

public static function infolist(Infolist $infolist): Infolist
{
    return $infolist
        ->schema([
            MapEntry::make('location')
                ->extraStyles([
                    'min-height: 50vh',
                    'border-radius: 50px'
                ])
                ->state(fn ($record) => ['lat' => $record?->latitude, 'lng' => $record?->longitude])
                ->showMarker()
                ->markerColor("#22c55eff")
                ->showFullscreenControl()
                ->draggable(false)
                ->zoom(15),

            .....
        ]);
}
```
<hr/>


## Usage Guide for Handling Map Locations

This section explains how to handle and display map locations within your application using this package.

**Step 1: Define Your Database Schema**

Ensure your database table includes latitude and longitude columns.
This is essential for storing the coordinates of your locations. You can define your table schema as follows:

```php
$table->double('latitude')->nullable();
$table->double('longitude')->nullable();
```

**Step 2: Retrieve and Set Coordinates**

When loading a record, ensure you correctly retrieve and set the latitude and longitude values.
Use the following method within your form component:

```php
->afterStateHydrated(function ($state, $record, Set $set): void {
    $set('location', ['lat' => $record?->latitude, 'lng' => $record?->longitude]);
})
```

**Step 3: Add Form Fields for Latitude and Longitude**

Add hidden form fields for latitude and longitude to your form. This ensures the values are present but not visible to the user:

```php
TextInput::make('latitude')
    ->hiddenLabel()
    ->hidden(),

TextInput::make('longitude')
    ->hiddenLabel()
    ->hidden()
```

If you prefer to display these values in a read-only format, replace `hidden()` with `readOnly()`.

### Alternative Approach: Using a Single Location Attribute

If you prefer to handle the location as a single field, you can define a custom attribute in your model. This method avoids the need for separate latitude and longitude columns:

```php
class YourModel extends Model
{
    protected function location(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value, array $attributes) => [
                'latitude' => $attributes['latitude'],
                'longitude' => $attributes['longitude']
            ],
            set: fn (array $value) => [
                'latitude' => $value['latitude'],
                'longitude' => $value['longitude']
            ],
        );
    }
}
```

This approach encapsulates both latitude and longitude within a single location attribute, streamlining your code.




## License

[MIT License](LICENSE.md) © Doode

## Security

We take security seriously. 
If you discover any bugs or security issues, please help us maintain a secure project by reporting them through our [`GitHub issue tracker`][link-github-issue]. 
You can also contact us directly at [doode@doode.com.br](mailto:doode@doode.com.br).

## Contribution

We welcome contributions! contributions are what make the open source community such an amazing place to learn, inspire, and create. 
Any contributions you make are greatly appreciated.
If you have a suggestion that would make this better, please fork the repo and create a pull request. 
You can also simply open an issue with the tag "enhancement". Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


[ico-version]: https://img.shields.io/packagist/v/doode/filament-map-picker.svg?style=flat-square
[ico-license]: https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square
[ico-downloads]: https://img.shields.io/packagist/dt/doode/filament-map-picker.svg?style=flat-square

[link-workflow-test]: https://github.com/vitormicillo/filament-map-picker/actions/workflows/ci.yml
[link-packagist]: https://packagist.org/packages/vitormicillo/filament-map-picker
[link-license]: https://github.com/vitormicillo/filament-map-picker/blob/master/LICENSE.md
[link-downloads]: https://packagist.org/packages/vitormicillo/filament-map-picker
[link-readme]: https://github.com/vitormicillo/filament-map-picker/blob/master/README.md
[link-github-issue]: https://github.com/vitormicillo/filament-map-picker/issues
[link-docs]: https://github.com/vitormicillo/filament-map-picker/blob/master/docs/openapi.yaml
[link-composer-json]: https://github.com/vitormicillo/filament-map-picker/blob/master/composer.json
[link-gitignore]: https://github.com/vitormicillo/filament-map-picker/blob/master/.gitignore
[link-pint]: https://github.com/vitormicillo/filament-map-picker/blob/master/pint.json
[link-author]: https://github.com/vitormicillo
