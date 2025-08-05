<?php

declare(strict_types=1);

namespace Doode\MapPicker\Contracts;

use Closure;

interface MapOptions
{
    public function getMapConfig(): string;
    public function getExtraStyle(): string;
    public function draggable(bool|Closure $draggable = true): static;
    public function clickable(bool|Closure $clickable): static;
    public function setBoundsToBritishIsles(): static;
    public function defaultLocation(int|float|Closure $latitude, float|int|Closure $longitude): static;
    public function extraStyles(array|Closure $styles = []): static;
    public function rangeSelectField(string|Closure $rangeSelectField): static;
    public function drawCircleMarker(bool|Closure $draw = true): static;
    public function zoom(int|Closure $zoom): static;
    public function maxZoom(int|Closure $maxZoom): static;
    public function minZoom(int|Closure $minZoom): static;
    public function showMarker(bool|Closure $show = true): static;
    public function boundaries(bool|Closure $on, int|float|Closure $southWestLat = 0, int|float|Closure $southWestLng = 0, int|float|Closure $northEastLat = 0, int|float|Closure $northEastLng = 0): static;
    public function detectRetina(bool|Closure $detectRetina = true): static;
    public function showZoomControl(bool|Closure $show = true): static;
    public function showFullscreenControl(bool|Closure $show = true): static;
    public function extraControl(array|Closure $control): static;
    public function extraTileControl(array|Closure $control): static;
    public function markerColor(string|Closure $color): static;
    public function iconSize(int|Closure $size): static;
    public function liveLocation(bool|Closure $send = false, bool|Closure $realtime = false, int|Closure $milliseconds = 5000): static;
    public function showMyLocationButton(bool|Closure $showMyLocationButton = true): static;
    public function geoManToolbar(bool|Closure $show = true): static;
    public function geoManEditable(bool $show = true): self;
    public function geoManPosition(string|Closure $position = 'topright'): static;
    public function rotateMode(bool|Closure $rotate = true): static;
    public function drawMarker(bool|Closure $draw = true): static;
    public function drawPolygon(bool|Closure $draw = true): static;
    public function editPolygon(bool $edit = true): self;
    public function drawPolyline(bool|Closure $draw = true): static;
    public function drawCircle(bool|Closure $draw = true): static;
    public function snappable(bool|Closure $snappable = true, int|Closure $distance = 20): static;
    public function drawRectangle(bool|Closure $draw = true): static;
    public function drawText(bool|Closure $draw = true): static;
    public function deleteLayer(bool|Closure $delete = true): static;
    public function dragMode(bool|Closure $enable = true): static;
    public function cutPolygon(bool|Closure $enable = true): static;
    public function setBorderColor(string|Closure $borderColor): static;
    public function setColor(string|Closure $color): static;
    public function setFillColor(string|Closure $fillColor): static;
    public function baseLayers(array|Closure $layers): static;
    public function defaultBaseLayer(string|Closure $layerName): static;
    public function overlayLayers(array|Closure $layers): static; // Add overlayLayers

}
