import * as LF from 'leaflet'
import 'leaflet-fullscreen'
import '@geoman-io/leaflet-geoman-free'
import { toBlob } from 'html-to-image';

document.addEventListener('DOMContentLoaded', () => {
    window.mapPicker = ($wire, config, state) => {
        return {
            map: null,
            tile: null,
            marker: null,
            rangeCircle: null,
            drawItems: null,
            rangeSelectField: null,
            markerShouldMoveWithMap: false,

            // Necessary to validate GEOJSON data
            isVariableValid: function(value) {
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

                return typeof value === 'boolean';
            },

            createMap: function(el) {
                const that = this;
                const geoJsonBox = document.getElementById('geomanbox');
                const zoomLevel = config.controls.zoom || config.zoom() || 10;

                this.map = LF.map(el, config.controls);

                if(config.bounds) {
                    let southWest = LF.latLng(config.bounds.sw.lat, config.bounds.sw.lng);
                    let northEast = LF.latLng(config.bounds.ne.lat, config.bounds.ne.lng);
                    let bounds = LF.latLngBounds(southWest, northEast);
                    this.map.setMaxBounds(bounds);
                    this.map.fitBounds(bounds);
                    this.map.on('drag', function() {
                        map.panInsideBounds(bounds, { animate: false });
                    });
                }

                this.map.on('load', () => {
                    setTimeout(() => this.map.invalidateSize(true), 0);
                    if (config.showMarker) {
                        this.marker.setLatLng(this.map.getCenter());
                    }
                });

                if (!config.draggable) {
                    this.map.dragging.disable();
                }

                if(config.clickable) {
                    this.map.on('click', function(e) {
                        that.setCoordinates(e.latlng);
                    });
                }

                this.tile = LF.tileLayer(config.tilesUrl, {
                    attribution: config.attribution,
                    minZoom: config.minZoom,
                    maxZoom: config.maxZoom,
                    tileSize: config.tileSize,
                    zoomOffset: config.zoomOffset,
                    detectRetina: config.detectRetina,
                    crossOrigin: true
                }).addTo(this.map);

                let location = state ?? this.getCoordinates();

                if (config.showMarker) {
                    const markerColor = config.markerColor || "#3b82f6";
                    const svgIcon = LF.divIcon({
                        html: this.defaultIconMarker(markerColor),
                        className: "",
                        iconSize: [config.iconSize, config.iconSize],
                    });

                    // Initialize the marker at the stored coordinates or 0,0 if not available
                    let markerPosition = [location.lat || 0, location.lng || 0];

                    this.marker = LF.marker(markerPosition, {
                        icon: svgIcon,
                        draggable: false,
                        autoPan: true
                    }).addTo(this.map);

                    this.setMarkerRange();

                    // Define moveMarkerToCenter function
                    this.moveMarkerToCenter = () => {
                        if(this.markerShouldMoveWithMap){
                            this.marker.setLatLng(this.map.getCenter());
                        }
                    };

                    // Always attach the move event listener
                    this.map.on('move', this.moveMarkerToCenter);

                    // Set the initial value of markerShouldMoveWithMap
                    this.markerShouldMoveWithMap = (!location.lat && !location.lng) && !config.clickable;

                }

                this.map.on('moveend', () => setTimeout(() => this.updateLocation(), 500));

                this.map.on('locationfound', function() {
                    that.map.setZoom(config.control.zoom);
                });

                if (!location.lat && !location.lng) {
                    this.map.locate({
                        setView: true,
                        maxZoom: config.controls.maxZoom,
                        enableHighAccuracy: true,
                        watch: false
                    });
                } else {
                    this.map.setView(new LF.LatLng(location.lat, location.lng), zoomLevel);
                }

                if (config.showMyLocationButton) {
                    this.addLocationButton();
                }

                if (config.liveLocation.send && config.liveLocation.realtime) {
                    setInterval(() => {
                        this.fetchCurrentLocation();
                    }, config.liveLocation.milliseconds);
                }

                // Geoman Toolbar Controls, hide or enable it from filament resource
                if (config.geoManToolbar.show) {
                    this.map.pm.addControls({
                        position: config.geoManToolbar.position,
                        rotateMode: config.geoManToolbar.rotateMode,
                        drawCircleMarker: config.geoManToolbar.drawCircleMarker,
                        drawMarker: config.geoManToolbar.drawMarker,
                        drawPolygon: config.geoManToolbar.drawPolygon,
                        drawPolyline: config.geoManToolbar.drawPolyline,
                        drawCircle: config.geoManToolbar.drawCircle,
                        drawText: config.geoManToolbar.drawText,
                        editMode: config.geoManToolbar.editMode,
                        dragMode: config.geoManToolbar.dragMode,
                        cutPolygon: config.geoManToolbar.cutPolygon,
                        editPolygon: config.geoManToolbar.editPolygon,
                        deleteLayer: config.geoManToolbar.deleteLayer
                    });

                    let drawItems = new LF.FeatureGroup().addTo(this.map);

                    // If GeoJsonBox is available load all necessary
                    if (geoJsonBox) {
                        console.info('geomanbox field exists in DOM');

                        if (this.isVariableValid(geoJsonBox.value)) {
                            const geomData = JSON.parse(geoJsonBox.value);

                            // Create the GeoJSON layer and add it to the map
                            drawItems = LF.geoJSON(geomData, {
                                style: {
                                    color: config.liveLocation?.color || "#FFFFFF",
                                    fillColor: 'blue',
                                    fillOpacity: 0.5,
                                }
                            }).addTo(this.map);

                            // Get the bounds of the GeoJSON layer
                            const geojsonBounds = drawItems.getBounds();

                            // Check if bounds are valid
                            if (geojsonBounds.isValid()) {
                                // Fit the map view to the bounds of the GeoJSON layer
                                this.map.fitBounds(geojsonBounds, {
                                    maxZoom: zoomLevel, // Use zoomLevel as the maximum zoom level
                                    padding: [20, 20],  // Optional padding around the features
                                });
                            } else {
                                // Handle single point or invalid bounds
                                let coordinates;

                                if (geomData.type === 'FeatureCollection' && geomData.features.length > 0) {
                                    coordinates = geomData.features[0].geometry.coordinates;
                                } else if (geomData.type === 'Feature') {
                                    coordinates = geomData.geometry.coordinates;
                                } else if (geomData.type === 'Point') {
                                    coordinates = geomData.coordinates;
                                } else {
                                    console.error('Unsupported GeoJSON type or empty features');
                                    // Set to default location if unable to get coordinates
                                    coordinates = [config.default.lng, config.default.lat];
                                }

                                // Center the map on the coordinates
                                this.map.setView([coordinates[1], coordinates[0]], zoomLevel);
                            }

                        } else {
                            console.info("No Data to Edit");
                            // Set the map view to a default position and zoom
                            this.map.setView([config.default.lat, config.default.lng], zoomLevel);
                        }
                    } else {
                        console.warn("geomanbox field is not available");
                    }

                    // To Drawing shapes in the map
                    this.map.on('pm:create', function(e) {
                        if (e.layer && e.layer.pm) {
                            const shape = e;
                            shape.layer.pm.enable();
                            drawItems.addLayer(shape.layer);

                            if (geoJsonBox) {
                                geoJsonBox.value = JSON.stringify(drawItems.toGeoJSON());
                                $wire.set(config.statePath, { geojson: geoJsonBox.value }, false)
                                $wire.$refresh();

                                shape.layer.on('pm:edit', (e) => {
                                    geoJsonBox.value = JSON.stringify(drawItems.toGeoJSON());
                                    $wire.set(config.statePath, { geojson: geoJsonBox.value }, false)
                                    $wire.$refresh();
                                })

                            } else {
                                alert("This is just an alert to let you know the field 'geomanbox' was not found in the form to store geojson data")
                                console.warn("Field 'geomanbox' was not found in the structure")
                            }

                        } else {
                            console.log('Not a shape');
                        }
                    });

                    drawItems.on('pm:edit', (e) => {
                        geoJsonBox.value = JSON.stringify(drawItems.toGeoJSON());
                        $wire.set(config.statePath, { geojson: geoJsonBox.value }, false)
                        $wire.$refresh();
                    });

                    this.map.on('pm:remove', (e) => {
                        drawItems.removeLayer(e.layer);
                        geoJsonBox.value = JSON.stringify(drawItems.toGeoJSON());
                        $wire.set(config.statePath, { geojson: geoJsonBox.value }, false)
                        $wire.$refresh();
                    });

                }
            },

            updateLocation: function() {
                let coordinates = this.getCoordinates();
                let currentCenter = this.map.getCenter();

                // User can pass extra parameter to indicate a different marker icon
                if(coordinates.icon){
                    this.fetchInitialCategoryIcon(coordinates.icon);
                }

                // Only update location if the marker moves with the map center
                if (this.markerShouldMoveWithMap) {
                    if (coordinates.lng !== currentCenter.lng || coordinates.lat !== currentCenter.lat) {
                        $wire.set(config.statePath, currentCenter, false);
                        if (config.liveLocation.send) {
                            $wire.$refresh();
                        }
                    }
                }
            },

            removeMap: function(el) {
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

            getCoordinates: function() {
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

            setCoordinates: function (coords) {
                $wire.set(config.statePath, {
                    ...$wire.get(config.statePath),
                    lat: coords.lat,
                    lng: coords.lng
                }, false);

                if (config.liveLocation.send) {
                    $wire.$refresh();
                }

                // Update the marker position
                // Since the user explicitly set the coordinates, we may want to fix the marker
                this.marker.setLatLng(coords);
                this.markerShouldMoveWithMap = false;
                this.updateMarker();
                return coords;
            },

            attach: function(el) {
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

            fetchCurrentLocation: function() {
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(async position => {
                        const currentPosition = new LF.LatLng(position.coords.latitude, position.coords.longitude);
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
                locationButton.innerHTML = this.defaultIconMarker("currentColor");
                locationButton.type = 'button';
                locationButton.classList.add('map-location-button');
                locationButton.onclick = () => this.fetchCurrentLocation();
                this.map.getContainer().appendChild(locationButton);
            },

            setMarkerRange: function () {
                if(!this.rangeSelectField)
                    return ;
                distance=parseInt(this.rangeSelectField.value || 0 ) ;
                if (this.rangeCircle) {
                    this.rangeCircle.setLatLng(this.getCoordinates()).setRadius(distance);
                } else {
                    this.rangeCircle = LF.circle(this.getCoordinates(), {
                        color: 'blue',
                        fillColor: '#f03',
                        fillOpacity: 0.5,
                        radius: distance // The radius in meters
                    }).addTo(this.map);
                }
            },

            init: function() {
                this.$wire = $wire;
                this.config = config;
                this.state = state;
                this.rangeSelectField = document.getElementById(config.rangeSelectField || 'data.distance');

                $wire.on('refreshMap', this.refreshMap.bind(this));

                $wire.on('captureMapImage', () => {
                    this.captureAndUploadMapImage();
                });

                $wire.on('updateMapLocation', (coordinates) => {
                    const { lat, lng, fix } = coordinates[0];
                    this.updateMapLocation(lat,lng,fix);
                });

                $wire.on('updateMarkerIcon', (icon) => {
                    this.updateMarkerIcon(icon);
                });

                $wire.on('loadGeoJsonDataFromFile', (data) => {
                    this.loadGeoJsonDataFromFile(data);
                });
            },

            // Returns a standard marker element
            defaultIconMarker: function(markerColor){
                return `<svg xmlns="http://www.w3.org/2000/svg" class="map-icon" fill="${markerColor}" width="32" height="32" viewBox="0 0 24 24"><path d="M12 0c-4.198 0-8 3.403-8 7.602 0 4.198 3.469 9.21 8 16.398 4.531-7.188 8-12.2 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z"/></svg>`;
            },

            updateMarker: function() {
                if (config.showMarker) {
                    this.marker.setLatLng(this.getCoordinates());
                    this.setMarkerRange();
                    setTimeout(() => this.updateLocation(), 500);
                }
            },

            // Function used for live updated after map rendered
            // and user set map position on PageResource
            updateMapLocation: function(lat, lng, fix) {
                // Set marker to the new coordinates and update flag
                if (this.marker) {
                    this.marker.setLatLng([lat, lng]);
                    this.markerShouldMoveWithMap = !fix;
                }
            },

            // Function used for live update icon based on
            // category selected in Filament Resource
            // To use this is necessary encode image with base64
            updateMarkerIcon: function(base64Icon) {
                if (this.marker) {
                    let newIcon;
                    if (base64Icon[0]['icon']) {
                        // Create a new icon
                        newIcon = LF.icon({
                            iconUrl: base64Icon[0]['icon'],
                            iconSize: [config.iconSize, config.iconSize]
                        });
                    } else {
                        // Use the default icon
                        const markerColor = this.config.markerColor || "#3b82f6";
                        newIcon = LF.divIcon({
                            html: this.defaultIconMarker(markerColor),
                            className: "",
                            iconSize: [config.iconSize, config.iconSize]
                        });
                    }

                    this.marker.setIcon(newIcon);
                }
            },

            // Editing a record, if user select a different marker
            // this function updated maps using the icon url
            fetchInitialCategoryIcon: function(icon) {
                if(this.marker){
                    let newIcon;
                    if(icon){
                        newIcon = LF.icon({
                            iconUrl: icon,
                            iconSize: [config.iconSize, config.iconSize]
                        });
                        this.marker.setIcon(newIcon);
                    }
                }
            },

            // Function to generate a map snapshot and submit the file to the laravel route
            // 'admin/upload-map-image' via POST method
            captureAndUploadMapImage: function(){
                const mapContainer = this.map.getContainer();

                toBlob(mapContainer, {
                    // Hide controls before generating image
                    filter: (element) => {
                            if (element.classList && element.classList.contains('leaflet-control-container')){
                                return false;
                            }
                            return true;
                        },
                        // Optionally specify width/height:
                        width: mapContainer.offsetWidth,
                        height: mapContainer.offsetHeight
                    }).then((blob) => {

                        if(!blob || !(blob instanceof Blob)){
                            throw new Error('domtoimage did not return a valid blob object');
                        }

                        // Create a FormData object
                        const formData = new FormData();
                        formData.append('map_image', blob, 'map.png');

                        // Send the image to the server using fetch API
                        fetch('/admin/upload-map-image', {
                            method: 'POST',
                            headers: {
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                            },
                            body: formData,
                        })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    console.info('Snapshot successfully generated. Note: Remember to save your form data before leaving the page.');
                                    alert('Snapshot successfully generated. Note: Remember to save your form data before leaving the page.');
                                } else {
                                    console.error('Error uploading map image:', data.message);
                                    alert('Error uploading map image:'+ data.message);
                                }
                            })
                            .catch((error) => {
                                console.error('Error uploading map image:', error);
                                alert('Error capturing map image:'+ error);
                            });
                    })
                    .catch((error) => {
                        console.error('Error capturing map image:', error);
                        alert('Error capturing map image:'+ error);
                    });
            },

            // Function to create shapes based in the geojson file from filament file field
            loadGeoJsonDataFromFile(data) {
                if(this.isVariableValid(data)){
                    const coordinates = JSON.parse(data[0]);

                    // Clear existing layers if you want to replace them entirely
                    if (this.drawItems) {
                        // If `drawItems` is a FeatureGroup, you can clear it:
                        this.drawItems.clearLayers();
                    } else {
                        // If drawItems hasn't been set yet, create it
                        this.drawItems = new LF.FeatureGroup().addTo(this.map);
                    }

                    const newGeoJsonLayer = LF.geoJSON(coordinates, {
                        style: {
                            color: "#FFFFFF",
                            fillColor: 'blue',
                            fillOpacity: 0.5
                        }
                    }).addTo(this.drawItems);

                    // Attempt to fit the map to the new layer’s bounds
                    const geojsonBounds = newGeoJsonLayer.getBounds();
                    const zoomLevel = this.config.controls.zoom || this.config.zoom() || 13;

                    if (geojsonBounds.isValid()) {
                        this.map.fitBounds(geojsonBounds, {
                            maxZoom: zoomLevel,
                            padding: [20, 20],
                        });
                    } else {
                        console.warn('GeoJSON has invalid or single-point bounds; using defaults.');
                        this.map.setView([this.config.default.lat, this.config.default.lng], zoomLevel);
                    }
                }
            },

            refreshMap: function() {
                this.map.flyTo(this.getCoordinates());
                this.updateMarker();
            }
        };
    };
    window.dispatchEvent(new CustomEvent('map-script-loaded'));
});
