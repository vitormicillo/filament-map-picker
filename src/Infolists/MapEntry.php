<?php

declare(strict_types=1);

namespace Doode\MapPicker\Infolists;

use Closure;
use Doode\MapPicker\Contracts\MapOptions;
use Filament\Infolists\Components\Entry;

class MapEntry extends Entry implements MapOptions
{
    protected string $view = 'map-picker::infolists.osm-map-entry';

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
            'editPolygon' => true,
            'cutPolygon' => true,
            'drawPolyline' => true,
            'drawCircle' => true,
            'dragMode' => true,
            'deleteLayer' => true,
            'color' => '#3388ff',
            'filledColor' => '#cad9ec',
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
        'doubleClickZoom' => 'center',
        'touchZoom' => 'center',
        'minZoom' => 1,
        'maxZoom' => 28,
        'zoom' => 10,
        'fullscreenControl' => true,
    ];

    protected array $extraStyle = [];

    protected array $extraControls = [];

    public function getMapConfig(): string
    {
        return json_encode(array_merge($this->mapConfig, [
            'statePath' => $this->getStatePath(),
            'controls' => array_merge($this->controls, $this->extraControls),
        ]));
    }

    public function getExtraStyle(): string
    {
        return implode(';', $this->extraStyle);
    }

    public function draggable(bool|Closure $draggable = true): static
    {
        $this->mapConfig['draggable'] = $draggable;

        return $this;
    }

    public function defaultLocation(int|float|Closure $latitude, float|int|Closure $longitude): static
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
        $this->controls['zoom'] = $zoom;

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
        $this->mapConfig = array_merge($this->mapConfig, $control);

        return $this;
    }

    public function clickable(bool|Closure $clickable = false): static  // Default to false for infolists
    {
        $this->mapConfig['clickable'] = $clickable;

        return $this;
    }

    public function boundaries(bool|Closure $on, int|float|Closure $southWestLat = 0, int|float|Closure $southWestLng = 0, int|float|Closure $northEastLat = 0, int|float|Closure $northEastLng = 0): static
    {
        if (is_bool($on) && ! $on) {
            $this->mapConfig['bounds'] = false;
        } else {
            $this->mapConfig['bounds'] = [
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
        return $this->boundaries(true, 49.5, -11, 61, 2);
    }

    public function rangeSelectField(string|Closure $rangeSelectField): static
    {
        // rangeSelectField isn't relevant in an infolist context,
        //  as there's no user interaction.  But keep the method
        //  to satisfy the MapOptions interface.
        return $this;
    }

    // The remaining GeoMan methods are the same as in Map, but with `static` return types
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

    public function setColor(string|Closure $color): static
    {
        $this->mapConfig['geoManToolbar']['color'] = $color;

        return $this;
    }

    public function setFilledColor(string|Closure $filledColor): static
    {
        $this->mapConfig['geoManToolbar']['filledColor'] = $filledColor;

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
