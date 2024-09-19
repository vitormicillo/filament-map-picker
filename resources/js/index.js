import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import 'leaflet-fullscreen';
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

document.addEventListener('DOMContentLoaded', () => {
    const mapPicker = ($wire, config, state) => {
        return {
            map: null,
            tile: null,
            marker: null,

            isVariableValid: function (value){
                if (typeof value === 'undefined' || value === null) {
                    return false;
                }

                if (typeof value === 'string') {
                    return value.trim() !== '';
                }

                if (Array.isArray(value)) {
                    return value.length > 0;
                }

                if (typeof value === 'object') {
                    return Object.keys(value).length > 0;
                }

                if (typeof value === 'number') {
                    return !isNaN(value);
                }

                if (typeof value === 'boolean') {
                    return true;
                }

                return false;
            },

            createMap: function (el) {
                const that = this;

                const geoJsonBox = document.getElementById('geomanbox');

                this.map = L.map(el, config.controls);
                this.map.on('load', () => {
                    setTimeout(() => this.map.invalidateSize(true), 0);
                    if (config.showMarker) {
                        this.marker.setLatLng(this.map.getCenter());
                    }
                });

                if (!config.draggable) { this.map.dragging.disable(); }

                this.tile = L.tileLayer(config.tilesUrl, {
                    attribution: config.attribution,
                    minZoom: config.minZoom,
                    maxZoom: config.maxZoom,
                    tileSize: config.tileSize,
                    zoomOffset: config.zoomOffset,
                    detectRetina: config.detectRetina,
                }).addTo(this.map);

                // Geoman Toolbar Controls
                this.map.pm.addControls({
                    position: 'topright',
                    drawPolygon: true,
                    drawRectangle: true,
                    editMode: true,
                    drawMarker: false,
                    drawCircle: false,
                    drawText: false,
                    drawPolyline: false,
                    deleteMode: false,
                    drawCircleMarker: false,
                    rotateMode: false,
                });

                let drawItems = new L.FeatureGroup().addTo(this.map);

                if (config.showMarker) {
                    const markerColor = config.markerColor || "#3b82f6";
                    const svgIcon = L.divIcon({
                        html: `<svg xmlns="http://www.w3.org/2000/svg" class="map-icon" fill="${markerColor}" width="36" height="36" viewBox="0 0 24 24"><path d="M12 0c-4.198 0-8 3.403-8 7.602 0 4.198 3.469 9.21 8 16.398 4.531-7.188 8-12.2 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z"/></svg>`,
                        className: "",
                        iconSize: [36, 36],
                        iconAnchor: [18, 36],
                    });
                    this.marker = L.marker([0, 0], {
                        icon: svgIcon,
                        draggable: false,
                        autoPan: true
                    }).addTo(this.map);
                    this.map.on('move', () => this.marker.setLatLng(this.map.getCenter()));
                }

                this.map.on('moveend', () => setTimeout(() => this.updateLocation(), 500));

                this.map.on('locationfound', function () {
                    that.map.setZoom(config.controls.zoom);
                });

                let location = state ?? this.getCoordinates();
                if (!location.lat && !location.lng) {
                    this.map.locate({
                        setView: true,
                        maxZoom: config.controls.maxZoom,
                        enableHighAccuracy: true,
                        watch: false
                    });
                } else {
                    this.map.setView(new L.LatLng(location.lat, location.lng));
                }

                if (config.showMyLocationButton) {
                    this.addLocationButton();
                }

                if (config.liveLocation.send && config.liveLocation.realtime) {
                    setInterval(() => {
                        this.fetchCurrentLocation();
                    }, config.liveLocation.milliseconds);
                }

                if(geoJsonBox) {
                    console.log('geomandb field exists in DOM');
                    if (this.isVariableValid(geoJsonBox.value)) {

                        console.info("Editing Data");
                        const geomData = JSON.parse(geoJsonBox.value);
                        // center map with coordinates
                        const getBounds = this.map.fitBounds(L.geoJSON(geomData).getBounds());
                        const position = getBounds.getCenter();
                        this.map.setView(position, 12);
                        drawItems = new L.geoJSON(geomData, {
                            style: {
                                color: config.liveLocation.color || "#FFFFFF",
                                fillColor: 'blue',
                                fillOpacity: 0.5,
                            }
                        });
                        this.map.addLayer(drawItems);
                        this.map.fitBounds(drawItems.getBounds());
                        this.map.setZoom(13);

                    } else {
                        console.info("No Data to Edit");
                        this.map.addLayer(drawItems);
                        this.map.setZoom(5);
                    }
                }

                // To Drawing shapes in the map
                this.map.on('pm:create', function(e) {
                    if (e.layer && e.layer.pm){
                        const shape = e;
                        shape.layer.pm.enable();
                        drawItems.addLayer(shape.layer);

                        if (geoJsonBox) {
                            geoJsonBox.value = JSON.stringify(drawItems.toGeoJSON());
                            console.log( JSON.stringify(drawItems.toGeoJSON()) );

                            $wire.set(config.statePath, {
                                geojson: JSON.stringify(drawItems.toGeoJSON())
                            } , false)

                            $wire.$refresh();

                            shape.layer.on('pm:edit', (e) => {
                                geoJsonBox.value = JSON.stringify(drawItems.toGeoJSON());
                                console.log( JSON.stringify(drawItems.toGeoJSON()) );
                                $wire.set(config.statePath, {
                                    geojson: JSON.stringify(drawItems.toGeoJSON())
                                } , false)
                                $wire.$refresh();
                            })



                        } else {
                            alert("Field 'geomanbox' was not found in the structure to store geojson data")
                            console.warn("Field 'geomanbox' was not found in the structure")
                        }

                        //$wire.call('handle_pm_create', e.layer.toGeoJSON());
                    } else {
                        console.log('Not a shape');
                    }
                });

                drawItems.on('pm:edit', (e) => {
                    geoJsonBox.value = JSON.stringify(drawItems.toGeoJSON());

                    $wire.set(config.statePath, {
                        geojson: JSON.stringify(drawItems.toGeoJSON())
                    }, false)

                    $wire.$refresh();
                });

                this.map.on('pm:remove', (e) => {
                   drawItems.removeLayer(e.layer);
                   geoJsonBox.value = JSON.stringify(drawItems.toGeoJSON());
                   $wire.$refresh();
                });

            },

            updateLocation: function() {
                let coordinates = this.getCoordinates();
                let currentCenter = this.map.getCenter();

                if (coordinates.lng !== currentCenter.lng || coordinates.lat !== currentCenter.lat) {
                    $wire.set(config.statePath, this.map.getCenter(), false);
                    if (config.liveLocation.send) {
                        $wire.$refresh();
                    }
                }
            },

            removeMap: function (el) {
                if (this.marker) {
                    this.marker.remove();
                    this.marker = null;
                }
                this.tile.remove();
                this.tile = null;
                this.map.off();
                this.map.remove();
                this.map = null;
            },

            getCoordinates: function () {
                let location = $wire.get(config.statePath) ?? {};

                const hasValidCoordinates = location.hasOwnProperty('lat') && location.hasOwnProperty('lng') &&
                    location.lat !== null && location.lng !== null;

                if (!hasValidCoordinates) {
                    location = {
                        lat: config.default.lat,
                        lng: config.default.lng
                    };
                }

                return location;
            },

            attach: function (el) {
                this.createMap(el);
                const observer = new IntersectionObserver(entries => {
                    entries.forEach(entry => {
                        if (entry.intersectionRatio > 0) {
                            if (!this.map)
                                this.createMap(el);
                        } else {
                            this.removeMap(el);
                        }
                    });
                }, {
                    root: null,
                    rootMargin: '0px',
                    threshold: 1.0
                });
                observer.observe(el);
            },

            fetchCurrentLocation: function () {
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(async position => {
                        const currentPosition = new L.LatLng(position.coords.latitude, position.coords.longitude);
                        await this.map.flyTo(currentPosition);

                        this.updateLocation();
                        this.updateMarker();
                    }, error => {
                        console.error('Error fetching current location:', error);
                    });
                } else {
                    alert('Geolocation is not supported by this browser.');
                }
            },

            addLocationButton: function() {
                const locationButton = document.createElement('button');
                locationButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 0C8.25 0 5 3.25 5 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.75-3.25-7-7-7zm0 10c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0-5c-1.11 0-2 .89-2 2s.89 2 2 2 2-.89 2-2-.89-2-2-2z"/></svg>';
                locationButton.type = 'button';
                locationButton.classList.add('map-location-button');
                locationButton.onclick = () => this.fetchCurrentLocation();
                this.map.getContainer().appendChild(locationButton);
            },

            init: function() {
                this.$wire = $wire;
                this.config = config;
                this.state = state;
                $wire.on('refreshMap', this.refreshMap.bind(this));
            },

            updateMarker: function() {
                if (config.showMarker) {
                    this.marker.setLatLng(this.getCoordinates());
                    setTimeout(() => this.updateLocation(), 500);
                }
            },

            refreshMap: function() {
                this.map.flyTo(this.getCoordinates());
                this.updateMarker();
            }
        };
    };

    window.mapPicker = mapPicker;
    window.dispatchEvent(new CustomEvent('map-script-loaded'));
});
