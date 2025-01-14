<?php

declare(strict_types=1);

namespace Doode\MapPicker\Fields;

use Doode\MapPicker\Contracts\MapOptions;
use Filament\Forms\Components\Field;
use Filament\Forms\Concerns\HasStateBindingModifiers;

class Map extends Field implements MapOptions
{
    use HasStateBindingModifiers;

    /**
     * Field view
     */
    public string $view = 'map-picker::fields.osm-map-picker';

    /**
     * Main field config variables
     */
    private array $mapConfig = [
        'statePath' => '',
        'draggable' => true,
        'showMarker' => true,
        'tilesUrl' => 'http://tile.openstreetmap.org/{z}/{x}/{y}.png',
        'attribution' => null,
        'zoomOffset' => -1,
        'tileSize' => 512,
        'detectRetina' => true,
        'rangeSelectField' => 'distance',
        'minZoom' => 1,
        'maxZoom' => 28,
        'zoom' => 8,
        'markerColor' => '#3b82f6',
        'iconSize' => 32,
        'liveLocation' => false,
        'bounds' => false,
        'showMyLocationButton' => [false, false, 5000],
        'default' => ['lat' => 0, 'lng' => 0],
        'geoManToolbar' => [
            'show' => true,
            'editable' => true,
            'position' => 'topright',
            'drawCircleMarker' => true,
            'rotateMode' => true,
            'drawMarker' => true,
            'drawPolygon' => true,
            'drawPolyline' => true,
            'drawCircle' => true,
            'drawText' => false,
            'dragMode' => true,
            'cutPolygon' => true,
            'editPolygon' => true,
            'deleteLayer' => true,
            'color' => '#3388ff',
            'filledColor' => '#cad9ec',
        ],
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
        'zoom' => 8,
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

    /**
     * Create extra styles string
     */
    public function getExtraStyle(): string
    {
        return implode(';', $this->extraStyle);
    }

    /**
     * Determines if the user can click to place the marker on the map.
     *
     * @return $this
     */
    public function clickable(bool $clickable): self
    {
        $this->mapConfig['clickable'] = $clickable;

        return $this;
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

    /**
     * Prevents the map from panning outside the defined box, and sets
     * a default location in the center of the box. It makes sense to
     * use this with a minimum zoom that suits the size of your map and
     * the size of the box or the way it pans back to the bounding box
     * looks strange. You can call with $on set to false to undo this.
     */
    public function boundaries(bool $on, int|float $southWestLat = 0, int|float $southWestLng = 0, int|float $northEastLat = 0, int|float $northEastLng = 0): self
    {
        if (!$on) {
            $this->mapConfig['boundaries'] = false;

            return $this;
        }

        $this->mapConfig['bounds']['sw'] = ['lat' => $southWestLat, 'lng' => $southWestLng];
        $this->mapConfig['bounds']['ne'] = ['lat' => $northEastLat, 'lng' => $northEastLng];
        $this->defaultLocation(($southWestLat + $northEastLat) / 2.0, ($southWestLng + $northEastLng) / 2.0);

        return $this;
    }

    /**
     * Convenience function for appropriate values for boundaries() when
     * you want the British Isles
     **/
    public function setBoundsToBritishIsles(): self
    {
        $this->boundaries(true, 49.5, -11, 61, 2);

        return $this;
    }

    public function defaultLocation(float|int $latitude, float|int $longitude): self
    {
        $this->mapConfig['default']['lat'] = $latitude;
        $this->mapConfig['default']['lng'] = $longitude;

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
     * Use the value of another field on the form for the range of the
     * circle surrounding the marker
     *
     * @param  string  $rangeSelectField,
     *                                     return $this
     **/
    public function rangeSelectField(string $rangeSelectField): self
    {
        $this->mapConfig['rangeSelectField'] = $rangeSelectField;

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
     * Enable or disable GeoMan functionality.
     *
     * @return $this
     */
    public function geoManToolbar(bool $show = true): self
    {
        $this->mapConfig['geoManToolbar']['show'] = $show;

        return $this;
    }

    /**
     * Enable or disable GeoMan edit mode.
     *
     * @return $this
     */
    public function geoManEditable(bool $show = true): self
    {
        $this->mapConfig['geoManToolbar']['editable'] = $show;

        return $this;
    }

    /**
     * Set GeoMan control position.
     *
     * @return $this
     *
     * @note Valid values: 'topleft', 'topright', 'bottomleft', 'bottomright'
     */
    public function geoManPosition(string $position = 'topleft'): self
    {
        $this->mapConfig['geoManToolbar']['position'] = $position;

        return $this;
    }

    /**
     * Enable or disable drawing of circle markers.
     *
     * @return $this
     */
    public function drawCircleMarker(bool $draw = true): self
    {
        $this->mapConfig['geoManToolbar']['drawCircleMarker'] = $draw;

        return $this;
    }

    /**
     * Enable or disable rotate mode.
     *
     * @return $this
     */
    public function rotateMode(bool $rotate = true): self
    {
        $this->mapConfig['geoManToolbar']['rotateMode'] = $rotate;

        return $this;
    }

    /**
     * Enable or disable drawing of markers.
     *
     * @return $this
     */
    public function drawMarker(bool $draw = true): self
    {
        $this->mapConfig['geoManToolbar']['drawMarker'] = $draw;

        return $this;
    }

    /**
     * Enable or disable drawing of polygons.
     *
     * @return $this
     */
    public function drawPolygon(bool $draw = true): self
    {
        $this->mapConfig['geoManToolbar']['drawPolygon'] = $draw;

        return $this;
    }

    /**
     * Enable or disable drawing of polylines.
     *
     * @return $this
     */
    public function drawPolyline(bool $draw = true): self
    {
        $this->mapConfig['geoManToolbar']['drawPolyline'] = $draw;

        return $this;
    }

    /**
     * Enable or disable drawing of circles.
     *
     * @return $this
     */
    public function drawCircle(bool $draw = true): self
    {
        $this->mapConfig['geoManToolbar']['drawCircle'] = $draw;

        return $this;
    }

    /**
     * Enable or disable drawing of texts.
     *
     * @return $this
     */
    public function drawText(bool $draw = true): self
    {
        $this->mapConfig['geoManToolbar']['drawText'] = $draw;

        return $this;
    }

    /**
     * Enable or disable editing of polygons.
     *
     * @return $this
     */
    public function editPolygon(bool $edit = true): self
    {
        $this->mapConfig['geoManToolbar']['editPolygon'] = $edit;

        return $this;
    }

    /**
     * Enable or disable deletion of layers.
     *
     * @return $this
     */
    public function deleteLayer(bool $delete = true): self
    {
        $this->mapConfig['geoManToolbar']['deleteLayer'] = $delete;

        return $this;
    }

    /**
     * Enable or disable drag mode.
     *
     * @return $this
     */
    public function dragMode(bool $enable = true): self
    {
        $this->mapConfig['geoManToolbar']['dragMode'] = $enable;

        return $this;
    }

    /**
     * Enable or disable polygon cutting.
     *
     * @return $this
     */
    public function cutPolygon(bool $enable = true): self
    {
        $this->mapConfig['geoManToolbar']['cutPolygon'] = $enable;

        return $this;
    }

    /**
     * Set the stroke color for drawings.
     *
     * @return $this
     */
    public function setColor(string $color): self
    {
        $this->mapConfig['geoManToolbar']['color'] = $color;

        return $this;
    }

    /**
     * Set the fill color for drawings.
     *
     * @return $this
     */
    public function setFilledColor(string $filledColor): self
    {
        $this->mapConfig['geoManToolbar']['filledColor'] = $filledColor;

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
