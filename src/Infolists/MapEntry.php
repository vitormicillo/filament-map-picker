<?php

declare(strict_types=1);

namespace Doode\MapPicker\Infolists;

use Closure;
use Doode\MapPicker\Contracts\MapOptions;
use Filament\Infolists\Components\Entry;

class MapEntry extends Entry implements MapOptions
{
    /**
     * Field view
     */
    public string $view = 'map-picker::infolists.osm-map-entry';

    /**
     * Main field config variables
     */
    private array $mapConfig = [
        'statePath' => '',
        'draggable' => true,
        'showMarker' => true,
        'showGeomanToolbar' => true,
        'tilesUrl' => 'http://tile.openstreetmap.org/{z}/{x}/{y}.png',
        'attribution' => null,
        'zoomOffset' => -1,
        'tileSize' => 512,
        'detectRetina' => true,
        'minZoom' => 0,
        'maxZoom' => 28,
        'zoom' => 15,
        'markerColor' => '#3b82f6',
        'iconSize' => 32,
        'liveLocation' => [false, false, 5000],
        'showMyLocationButton' => false,
        'default' => ['lat' => 0, 'lng' => 0],
    ];

    /**
     * Leaflet controls variables
     */
    private array $controls = [
        'zoomControl' => true,
        'scrollWheelZoom' => 'center',
        'doubleClickZoom' => 'center',
        'touchZoom' => 'center',
        'minZoom' => 1,
        'maxZoom' => 28,
        'zoom' => 15,
        'fullscreenControl' => true,
    ];

    private array $extraStyle = [];

    /**
     * Extra leaflet controls variables
     */
    private array $extraControls = [];

    /**
     * Create json configuration string
     */
    public function getMapConfig(): string
    {
        return json_encode(
            array_merge($this->mapConfig, [
                'statePath' => $this->getStatePath(),
                'controls' => array_merge($this->controls, $this->extraControls),
            ])
        );
    }

    /**
     * Create extra styles string
     */
    public function getExtraStyle(): string
    {
        return implode(';', $this->extraStyle);
    }

    /**
     * Determine if user can drag map around or not.
     *
     * @return MapOptions
     *
     * @note Default value is false
     */
    public function draggable(bool $draggable = true): self
    {
        $this->mapConfig['draggable'] = $draggable;

        return $this;
    }

    public function defaultLocation(Closure|array $location): self
    {
        $this->mapConfig['default']['lat'] = $location['lat'];
        $this->mapConfig['default']['lng'] = $location['lng'];

        return $this;
    }

    /**
     * Set extra style
     */
    public function extraStyles(array $styles = []): self
    {
        $this->extraStyle = $styles;

        return $this;
    }

    /**
     * Set default zoom
     *
     * @return MapOptions
     *
     * @note Default value 19
     */
    public function zoom(int $zoom): self
    {
        $this->controls['zoom'] = $zoom;

        return $this;
    }

    /**
     * Set max zoom
     *
     * @return $this
     *
     * @note Default value 20
     */
    public function maxZoom(int $maxZoom): self
    {
        $this->controls['maxZoom'] = $maxZoom;

        return $this;
    }

    /**
     * Set min zoom
     *
     * @param  int  $maxZoom
     * @return $this
     *
     * @note Default value 1
     */
    public function minZoom(int $minZoom): self
    {
        $this->controls['minZoom'] = $minZoom;

        return $this;
    }

    /**
     * Determine if marker is visible or not.
     *
     * @return $this
     *
     * @note Default value is false
     */
    public function showMarker(bool $show = true): self
    {
        $this->mapConfig['showMarker'] = $show;

        return $this;
    }

    public function showGeomanToolbar(bool $show = true): self
    {
        $this->mapConfig['showGeomanToolbar'] = $show;

        return $this;
    }

    /**
     * Set tiles url
     *
     * @return $this
     */
    public function tilesUrl(string $url): self
    {
        $this->mapConfig['tilesUrl'] = $url;

        return $this;
    }

    /**
     * Determine if it detects retina monitors or not.
     *
     * @return $this
     */
    public function detectRetina(bool $detectRetina = true): self
    {
        $this->mapConfig['detectRetina'] = $detectRetina;

        return $this;
    }

    /**
     * Determine if zoom box is visible or not.
     *
     * @return $this
     */
    public function showZoomControl(bool $show = true): self
    {
        $this->controls['zoomControl'] = $show;

        return $this;
    }

    /**
     * Determine if fullscreen box is visible or not.
     *
     * @return $this
     */
    public function showFullscreenControl(bool $show = true): self
    {
        $this->controls['fullscreenControl'] = $show;

        return $this;
    }

    /**
     * Change the marker color.
     *
     * @return $this
     */
    public function markerColor(string $color): self
    {
        $this->mapConfig['markerColor'] = $color;

        return $this;
    }

    /**
     * Change the marker icon size
     */
    public function iconSize(int $size): self
    {
        $this->mapConfig['iconSize'] = $size;

        return $this;
    }

    /**
     * Enable or disable live location updates for the map.
     *
     * @return $this
     */
    public function liveLocation(bool $send = true, bool $realtime = false, int $milliseconds = 5000): self
    {
        $this->mapConfig['liveLocation'] = [
            'send' => $send,
            'realtime' => $realtime,
            'milliseconds' => $milliseconds,
        ];

        return $this;
    }

    /**
     * Enable or disable show my location button on map.
     *
     * @return $this
     */
    public function showMyLocationButton(bool $showMyLocationButton = true): self
    {
        $this->mapConfig['showMyLocationButton'] = $showMyLocationButton;

        return $this;
    }

    /**
     * Append extra controls to be passed to leaflet map object
     *
     * @return $this
     */
    public function extraControl(array $control): self
    {
        $this->extraControls = array_merge($this->extraControls, $control);

        return $this;
    }

    /**
     * Append extra controls to be passed to leaflet tileLayer object
     *
     * @return $this
     */
    public function extraTileControl(array $control): self
    {
        $this->mapConfig = array_merge($this->mapConfig, $control);

        return $this;
    }

    /**
     * Setup function
     */
    protected function setUp(): void
    {
        parent::setUp();
    }
}
