<?php

declare(strict_types=1);

namespace Doode\MapPicker\Fields;

use Closure;
use Doode\MapPicker\Contracts\MapOptions;
use Filament\Forms\Components\Field;
use Filament\Forms\Concerns\HasStateBindingModifiers;

class Map extends Field implements MapOptions
{
    use HasStateBindingModifiers;

    protected string $view = 'map-picker::fields.osm-map-picker';

    protected array $mapConfig = [
        'statePath' => '',
        'draggable' => true,
        'showMarker' => true,
        'baseLayers' => [],
        'defaultBaseLayer' => 'OpenStreetMap',
        'attribution' => null,
        'zoomOffset' => -1,
        'tileSize' => 512,
        'detectRetina' => true,
        'rangeSelectField' => 'distance',
        'minZoom' => 1,
        'maxZoom' => 28,
        'zoom' => 8,
        'bounds' => false, // No need for nested structure initially.
        'showMyLocationButton' => false, // Single boolean value
        'default' => ['lat' => 0, 'lng' => 0],
        'markerColor' => '#3b82f6',
        'iconSize' => 32,
        'liveLocation' => [
            'send' => false,
            'realtime' => false,
            'milliseconds' => 5000,
        ],
        'geoManToolbar' => [
            'show' => true,
            'editable' => true,
            'position' => 'topleft',
            'drawCircleMarker' => true,
            'rotateMode' => true,
            'drawMarker' => true,
            'drawPolygon' => true,
            'drawPolyline' => true,
            'drawCircle' => true,
            'dragMode' => true,
            'editPolygon' => true,
            'cutPolygon' => true,
            'deleteLayer' => true,
            'color' => '#3388ff',
            'borderColor' => '#ffffff',
            'fillColor' => '#ffffff',
            'snappable' => false,
            'snapDistance' => 20,
            'drawText' => false,
            'drawRectangle' => true,
        ],
        'overlayLayers' => [],
        'clickable' => false, // Initialize clickable
    ];

    protected array $controls = [
        'zoomControl' => true,
        'scrollWheelZoom' => 'center',
        'doubleClickZoom' => 'center', // consistent string values.
        'touchZoom' => 'center',
        'minZoom' => 1,
        'maxZoom' => 28,
        'zoom' => 8,
        'fullscreenControl' => true,
    ];

    protected array $extraStyle = [];

    protected array $extraControls = [];

    public function getMapConfig(): string
    {
        $statePath = $this->getStatePath();
        $lastDotPosition = mb_strrpos($statePath, '.');
        $rangeSelectField = mb_substr($statePath, 0, $lastDotPosition + 1).$this->mapConfig['rangeSelectField'];

        return json_encode(
            array_merge($this->mapConfig, [
                'statePath' => $statePath,
                'rangeSelectField' => $rangeSelectField,
                'controls' => array_merge($this->controls, $this->extraControls),
            ])
        );
    }

    public function getExtraStyle(): string
    {
        return implode(';', $this->extraStyle);
    }

    public function clickable(bool|Closure $clickable = true): static  // Use static and allow Closures
    {
        $this->mapConfig['clickable'] = $clickable;

        return $this;
    }

    public function draggable(bool|Closure $draggable = true): static
    {
        $this->mapConfig['draggable'] = $draggable;

        return $this;
    }

    public function boundaries(bool|Closure $on, float|int|Closure $southWestLat = 0, float|int|Closure $southWestLng = 0, float|int|Closure $northEastLat = 0, float|int|Closure $northEastLng = 0): static
    {
        if (is_bool($on) && ! $on) {  // Only set to false if $on is a boolean and false.
            $this->mapConfig['bounds'] = false;
        } else {
            $this->mapConfig['bounds'] = [ // Set bounds when enabled.
                'sw' => ['lat' => $southWestLat, 'lng' => $southWestLng],
                'ne' => ['lat' => $northEastLat, 'lng' => $northEastLng],
            ];
        }

        // Calculate and set the default location *only if* bounds are being set.
        if (false !== $this->mapConfig['bounds']) {
            $this->defaultLocation(
                ($southWestLat + $northEastLat) / 2.0,
                ($southWestLng + $northEastLng) / 2.0
            );
        }

        return $this;
    }

    public function setBoundsToBritishIsles(): static
    {
        return $this->boundaries(true, 49.5, -11, 61, 2); // Use return for chaining.
    }

    public function defaultLocation(float|int|Closure $latitude, float|int|Closure $longitude): static
    {
        $this->mapConfig['default']['lat'] = $latitude;
        $this->mapConfig['default']['lng'] = $longitude;

        return $this;
    }

    public function extraStyles(array|Closure $styles = []): static
    {
        $this->extraStyle = $styles;

        return $this;
    }

    public function zoom(int|Closure $zoom): static
    {
        $this->controls['zoom'] = $zoom;  // Directly modify controls.

        return $this;
    }

    public function maxZoom(int|Closure $maxZoom): static
    {
        $this->controls['maxZoom'] = $maxZoom;

        return $this;
    }

    public function minZoom(int|Closure $minZoom): static
    {
        $this->controls['minZoom'] = $minZoom;

        return $this;
    }

    public function showMarker(bool|Closure $show = true): static
    {
        $this->mapConfig['showMarker'] = $show;

        return $this;
    }

    public function baseLayers(array|Closure $layers): static
    {
        $this->mapConfig['baseLayers'] = $layers;

        return $this;
    }

    public function defaultBaseLayer(string|Closure $layerName): static
    {
        $this->mapConfig['defaultBaseLayer'] = $layerName;

        return $this;
    }

    public function rangeSelectField(string|Closure $rangeSelectField): static
    {
        $this->mapConfig['rangeSelectField'] = $rangeSelectField;

        return $this;
    }

    public function detectRetina(bool|Closure $detectRetina = true): static
    {
        $this->mapConfig['detectRetina'] = $detectRetina;

        return $this;
    }

    public function showZoomControl(bool|Closure $show = true): static
    {
        $this->controls['zoomControl'] = $show;

        return $this;
    }

    public function showFullscreenControl(bool|Closure $show = true): static
    {
        $this->controls['fullscreenControl'] = $show;

        return $this;
    }

    public function markerColor(string|Closure $color): static
    {
        $this->mapConfig['markerColor'] = $color;

        return $this;
    }

    public function iconSize(int|Closure $size): static
    {
        $this->mapConfig['iconSize'] = $size;

        return $this;
    }

    public function liveLocation(bool|Closure $send = true, bool|Closure $realtime = false, int|Closure $milliseconds = 5000): static
    {
        $this->mapConfig['liveLocation'] = [
            'send' => $send,
            'realtime' => $realtime,
            'milliseconds' => $milliseconds,
        ];

        return $this;
    }

    public function showMyLocationButton(bool|Closure $showMyLocationButton = true): static
    {
        $this->mapConfig['showMyLocationButton'] = $showMyLocationButton;

        return $this;
    }

    public function extraControl(array|Closure $control): static
    {
        $this->extraControls = array_merge($this->extraControls, $control);

        return $this;
    }

    public function extraTileControl(array|Closure $control): static
    {
        //  This modifies mapConfig directly, not extraControls (which is for Leaflet *map* controls, not tile layer options)
        $this->mapConfig = array_merge($this->mapConfig, $control);

        return $this;
    }

    public function geoManToolbar(bool|Closure $show = true): static
    {
        $this->mapConfig['geoManToolbar']['show'] = $show;

        return $this;
    }

    public function geoManEditable(bool $show = true): self
    {
        $this->mapConfig['geoManToolbar']['editable'] = $show;
        return $this;
    }

    public function geoManPosition(string|Closure $position = 'topleft'): static
    {
        $this->mapConfig['geoManToolbar']['position'] = $position;

        return $this;
    }

    public function drawCircleMarker(bool|Closure $draw = true): static
    {
        $this->mapConfig['geoManToolbar']['drawCircleMarker'] = $draw;

        return $this;
    }

    public function rotateMode(bool|Closure $rotate = true): static
    {
        $this->mapConfig['geoManToolbar']['rotateMode'] = $rotate;

        return $this;
    }

    public function drawMarker(bool|Closure $draw = true): static
    {
        $this->mapConfig['geoManToolbar']['drawMarker'] = $draw;

        return $this;
    }

    public function drawPolygon(bool|Closure $draw = true): static
    {
        $this->mapConfig['geoManToolbar']['drawPolygon'] = $draw;

        return $this;
    }

    public function editPolygon(bool $edit = true): self
    {
        $this->mapConfig['geoManToolbar']['editPolygon'] = $edit;

        return $this;
    }

    public function drawPolyline(bool|Closure $draw = true): static
    {
        $this->mapConfig['geoManToolbar']['drawPolyline'] = $draw;

        return $this;
    }

    public function drawCircle(bool|Closure $draw = true): static
    {
        $this->mapConfig['geoManToolbar']['drawCircle'] = $draw;

        return $this;
    }

    public function snappable(bool|Closure $snappable = true, int|Closure $distance = 20): static
    {
        $this->mapConfig['geoManToolbar']['snappable'] = $snappable;
        $this->mapConfig['geoManToolbar']['snapDistance'] = $distance;

        return $this;
    }

    public function drawRectangle(bool|Closure $draw = true): static
    {
        $this->mapConfig['geoManToolbar']['drawRectangle'] = $draw;

        return $this;
    }

    public function drawText(bool|Closure $draw = true): static
    {
        $this->mapConfig['geoManToolbar']['drawText'] = $draw;

        return $this;
    }

    public function deleteLayer(bool|Closure $delete = true): static
    {
        $this->mapConfig['geoManToolbar']['deleteLayer'] = $delete;

        return $this;
    }

    public function dragMode(bool|Closure $enable = true): static
    {
        $this->mapConfig['geoManToolbar']['dragMode'] = $enable;

        return $this;
    }

    public function cutPolygon(bool|Closure $enable = true): static
    {
        $this->mapConfig['geoManToolbar']['cutPolygon'] = $enable;

        return $this;
    }

    public function setBorderColor(string|Closure $borderColor): static
    {
        $this->mapConfig['geoManToolbar']['borderColor'] = $borderColor;

        return $this;
    }

    public function setColor(string|Closure $color): static
    {
        $this->mapConfig['geoManToolbar']['color'] = $color;

        return $this;
    }

    public function setFillColor(string|Closure $fillColor): static
    {
        $this->mapConfig['geoManToolbar']['fillColor'] = $fillColor;

        return $this;
    }

    public function overlayLayers(array|Closure $layers): static
    {
        $this->mapConfig['overlayLayers'] = $layers;

        return $this;
    }

    protected function setUp(): void
    {
        parent::setUp();
    }
}
