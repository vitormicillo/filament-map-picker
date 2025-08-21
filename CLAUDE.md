# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Filament Map Picker is a PHP package that provides map-based location selection for Filament v3 applications. It integrates Leaflet maps with GeoMan drawing tools, allowing users to:

- Pick coordinates using interactive maps (OpenStreetMap, Google Maps)
- Draw and edit geometric shapes (polygons, polylines, circles, markers)
- Upload and render GeoJSON files
- Capture map snapshots
- Display maps in both form fields and infolist entries

## Architecture

### Core Components

**PHP Classes:**
- `MapPickerServiceProvider` (src/MapPickerServiceProvider.php:18): Main Laravel service provider, registers assets and views
- `Map` (src/Fields/Map.php:12): Filament form field for interactive map input
- `MapEntry` (src/Infolists/MapEntry.php:11): Filament infolist entry for map display
- `MapOptions` contract (src/Contracts/MapOptions.php): Interface defining map configuration methods

**Frontend Assets:**
- `resources/js/index.js`: Main JavaScript module handling Leaflet map initialization, GeoMan integration, and Livewire communication
- `resources/css/index.css`: Styles for map components
- Built assets in `resources/dist/`: Compiled CSS/JS files

**Views:**
- `resources/views/fields/osm-map-picker.blade.php`: Form field template
- `resources/views/infolists/osm-map-entry.blade.php`: Infolist entry template

### Key Dependencies

- **Filament v3**: UI framework integration
- **Leaflet**: JavaScript mapping library
- **GeoMan**: Drawing/editing tools for Leaflet
- **Laravel**: PHP framework foundation

## Development Commands

### PHP Development
- **Install dependencies**: `composer install`
- **Run tests**: `composer test` or `vendor/bin/pest`
- **Test with coverage**: `composer test-coverage` or `vendor/bin/pest --coverage`
- **Static analysis**: `composer analyse` or `vendor/bin/phpstan analyse`
- **Code formatting**: `composer format` or `vendor/bin/pint`

### Frontend Development
- **Install dependencies**: `npm install`
- **Development build (watch mode)**: `npm run dev`
- **Production build**: `npm run build`
- **Styles only (watch)**: `npm run dev:styles`
- **Scripts only (dev)**: `npm run dev:scripts`

### Build Process

The package uses a dual build system:
1. **Tailwind CSS** for styling (`tailwind.config.js`)
2. **esbuild** for JavaScript bundling (`bin/build.js`)

Built assets are output to `resources/dist/` and automatically registered by the service provider.

## Testing

- **Framework**: Pest PHP testing framework
- **Architecture tests**: tests/ArchTest.php validates coding standards
- **Configuration**: phpunit.xml.dist, coverage reports in `build/`
- **Quality tools**: PHPStan (level 4), Laravel Pint (PSR-12 preset)

## Configuration

- **Package config**: `config/filament-map-picker.php` (currently empty, returns empty array)
- **PHPStan**: `phpstan.neon.dist` - level 4, checks src/, config/, database/
- **Code style**: `pint.json` - PSR-12 with additional rules for strict types, logical operators, etc.

## Map Configuration

Both `Map` and `MapEntry` classes implement extensive fluent configuration:

**Basic Setup:**
```php
Map::make('location')
    ->defaultLocation(latitude: 52.8027, longitude: -1.0546)
    ->showMarker()
    ->draggable()
    ->zoom(10)
```

**Layer Configuration:**
- `baseLayers()`: Define tile layer sources (OSM, Google Maps, custom)
- `overlayLayers()`: Additional data layers (GeoJSON, API data, tiles)
- `defaultBaseLayer()`: Set default map style

**GeoMan Drawing Tools:**
- `geoManToolbar()`: Enable/disable drawing toolbar
- Drawing methods: `drawPolygon()`, `drawCircle()`, `drawMarker()`, etc.
- Style methods: `setColor()`, `setFillColor()`, `setBorderColor()`

## JavaScript Integration

The frontend JavaScript (resources/js/index.js:7) provides:

**Main Functions:**
- `window.mapPicker()`: Core map initialization function
- `createMap()`: Sets up Leaflet map with layers and controls
- `updateLocation()`: Syncs map state with Livewire
- `captureAndUploadMapImage()`: Screenshot functionality

**Livewire Events:**
- `refreshMap`: Update map position/marker
- `captureMapImage`: Trigger map screenshot
- `updateMarkerIcon`: Change marker appearance
- `loadGeoJsonDataFromFile`: Load shapes from uploaded files

## Package Standards

- **Namespace**: `Doode\MapPicker`
- **Strict types**: All PHP files use `declare(strict_types=1)`
- **Code style**: PSR-12 with Laravel Pint enhancements
- **Version compatibility**: PHP ^8.1, Laravel ^10.0||^11.0||^12.0, Filament ^3.2
- **Testing**: Uses Orchestra Testbench ^8.0||^9.0||^10.0 for Laravel 10/11/12 compatibility
- **Error reporting**: Collision ^8.1 for Laravel 11/12 compatibility
- **Asset management**: Automatic registration via FilamentAsset

## Maintenance Notes

- Assets must be rebuilt after JavaScript/CSS changes
- GeoJSON data is stored in hidden `geomanbox` field for form persistence
- Map coordinates are typically stored as separate `latitude`/`longitude` database columns
- Custom marker icons support base64 encoding or URL references
- Screenshot functionality requires specific route setup: `POST /upload-map-image`