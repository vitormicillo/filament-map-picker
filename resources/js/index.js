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

            /**
             * Checks if a variable contains valid data (not null, undefined, empty string, etc.).
             * @param {*} value The variable to check.
             * @returns {boolean} True if the variable is valid, false otherwise.
             */
            isVariableValid(value) {
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

            /**
             * Debounces a function.
             * @param {Function} func The function to debounce.
             * @param {number} wait The debounce delay in milliseconds.
             * @returns {Function} The debounced function.
             */
            debounce(func, wait) {
                let timeout;
                return function(...args) {
                    const context = this;
                    clearTimeout(timeout);
                    timeout = setTimeout(() => func.apply(context, args), wait);
                };
            },

            /**
             * Loads GeoJSON data onto the map.
             * @param {string} geojsonData - The GeoJSON data as a string.
             * @private
             */
            _loadGeoJSON(geojsonData) {
                if (!this.isVariableValid(geojsonData)) {
                    console.warn("Invalid GeoJSON data provided.");
                    this.map.setView([config.default.lat, config.default.lng], config.controls.zoom || config.zoom() || 10);
                    return;
                }

                try {
                    const parsedData = JSON.parse(geojsonData);

                    if (this.drawItems) {
                        this.drawItems.clearLayers();
                    } else {
                        this.drawItems = new LF.FeatureGroup().addTo(this.map);
                    }

                    const newGeoJsonLayer = LF.geoJSON(parsedData, {
                        style: {
                            color: config.liveLocation?.color || "#FFFFFF",
                            fillColor: 'blue',
                            fillOpacity: 0.5,
                        }
                    }).addTo(this.drawItems);

                    const geojsonBounds = newGeoJsonLayer.getBounds();
                    const zoomLevel = config.controls.zoom || config.zoom() || 13;

                    if (geojsonBounds.isValid()) {
                        this.map.fitBounds(geojsonBounds, {
                            maxZoom: zoomLevel,
                            padding: [20, 20],
                        });
                    } else {
                        console.warn('GeoJSON has invalid or single-point bounds; using defaults.');
                        let coordinates;

                        if (parsedData.type === 'FeatureCollection' && parsedData.features.length > 0) {
                            coordinates = parsedData.features[0].geometry.coordinates;
                        } else if (parsedData.type === 'Feature') {
                            coordinates = parsedData.geometry.coordinates;
                        } else if (parsedData.type === 'Point') {
                            coordinates = parsedData.coordinates;
                        } else {
                            console.error('Unsupported GeoJSON type or empty features');
                            coordinates = [config.default.lng, config.default.lat];
                        }
                        this.map.setView([coordinates[1], coordinates[0]], zoomLevel);
                    }
                } catch (error) {
                    console.error("Error parsing or loading GeoJSON:", error);
                    alert("Error loading GeoJSON data: " + error.message); // User feedback
                    this.map.setView([config.default.lat, config.default.lng], config.controls.zoom || config.zoom() || 10);
                }
            },

            createMap(el) {
                //const that = this;
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

                    this.moveMarkerToCenter = () => {
                        if(this.markerShouldMoveWithMap){
                            this.marker.setLatLng(this.map.getCenter());
                        }
                    };

                    this.map.on('move', this.debounce(() => {
                        if (this.markerShouldMoveWithMap) {
                            this.marker.setLatLng(this.map.getCenter());
                        }
                    }, 250));

                    this.map.on('moveend', this.debounce(() => this.updateLocation(), 500));
                    this.map.on('locationfound', () => {
                        this.map.setZoom(config.controls.zoom);
                    });
                }

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
                        snappable: config.geoManToolbar.snappable,
                        snapDistance: config.geoManToolbar.snapDistance,
                        position: config.geoManToolbar.position,
                        drawCircleMarker: config.geoManToolbar.drawCircleMarker,
                        rotateMode: config.geoManToolbar.rotateMode,
                        drawRectangle: config.geoManToolbar.drawRectangle,
                        drawText: config.geoManToolbar.drawText,
                        drawMarker: config.geoManToolbar.drawMarker,
                        drawPolygon: config.geoManToolbar.drawPolygon,
                        drawPolyline: config.geoManToolbar.drawPolyline,
                        drawCircle: config.geoManToolbar.drawCircle,
                        editMode: config.geoManToolbar.editMode,
                        dragMode: config.geoManToolbar.dragMode,
                        cutPolygon: config.geoManToolbar.cutPolygon,
                        editPolygon: config.geoManToolbar.editPolygon,
                        deleteLayer: config.geoManToolbar.deleteLayer
                    });

                    // CORRECT: Create the FeatureGroup *once* and store it as a property.
                    this.drawItems = new LF.FeatureGroup().addTo(this.map);

                    if (geoJsonBox) {
                        console.info('geomanbox field exists in DOM');
                        this._loadGeoJSON(geoJsonBox.value); // Load GeoJSON, adding to this.drawItems
                    } else {
                        console.warn("geomanbox field is not available");
                    }

                    // --- Event Handlers ---

                    // Function to handle updates (both create and edit)
                    const updateGeoJSON = () => {
                        try {
                            geoJsonBox.value = JSON.stringify(this.drawItems.toGeoJSON());
                            $wire.set(config.statePath, { geojson: geoJsonBox.value }, false);
                            $wire.$refresh();
                        } catch (error) {
                            console.error("Error updating GeoJSON:", error);
                            alert("Error updating GeoJSON: " + error.message);
                        }
                    };

                    // Create event
                    this.map.on('pm:create', (e) => {
                        if (e.layer && e.layer.pm) {
                            e.layer.pm.enable(); // Enable editing immediately
                            this.drawItems.addLayer(e.layer); // Add to the FeatureGroup

                            // Attach the edit listener to the NEWLY created layer
                            e.layer.on('pm:edit', updateGeoJSON);
                            updateGeoJSON(); // Update after creation
                        } else {
                            console.log('Not a shape');
                        }
                    });

                    //Edit Event. No need to check for circle.
                    this.map.on('pm:edit', updateGeoJSON);

                    // Remove event
                    this.map.on('pm:remove', (e) => {
                        if (this.drawItems) {
                            this.drawItems.removeLayer(e.layer);
                            updateGeoJSON(); // Update after removal
                        }

                    });

                    // Add this to attach edit event to the existent layers
                    this.drawItems.eachLayer((layer) => {
                        layer.on('pm:edit', updateGeoJSON);
                    });
                }
            },

            updateLocation() {
                let coordinates = this.getCoordinates();
                let currentCenter = this.map.getCenter();

                // User can pass extra parameter to indicate a different marker icon
                if(coordinates.icon){
                    this.fetchInitialCategoryIcon(coordinates.icon);
                }

                if (this.markerShouldMoveWithMap) {
                    if (coordinates.lng !== currentCenter.lng || coordinates.lat !== currentCenter.lat) {
                        $wire.set(config.statePath, {
                            ...$wire.get(config.statePath),
                            lat: currentCenter.lat,
                            lng: currentCenter.lng
                        }, false);
                        if (config.liveLocation.send) {
                            $wire.$refresh();
                        }
                    }
                }
            },

            removeMap(el) {
                if (this.marker) {
                    this.marker.remove();
                    this.marker = null;
                }
                if (this.tile) {
                    this.tile.remove();
                    this.tile = null;
                }
                if (this.map) {
                    this.map.off();
                    this.map.remove();
                    this.map = null;
                }
            },

            getCoordinates() {
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

            setCoordinates(coords) {
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

            attach(el) {
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

            fetchCurrentLocation() {
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(async position => {
                        const currentPosition = new LF.LatLng(position.coords.latitude, position.coords.longitude);
                        try {
                            await this.map.flyTo(currentPosition);
                            this.updateLocation();
                            this.updateMarker();
                        } catch (error) {
                            console.error("Error during flyTo or update:", error);
                            alert('An error occurred while updating the map.');
                        }
                    }, error => {
                        console.error('Error fetching current location:', error);
                        alert("Error fetching current location: " + error.message); // User-friendly error
                    });
                } else {
                    alert('Geolocation is not supported by this browser.');
                }
            },

            addLocationButton() {
                const locationButton = document.createElement('button');
                locationButton.innerHTML = this.defaultIconMarker("currentColor");
                locationButton.type = 'button';
                locationButton.classList.add('map-location-button');
                locationButton.onclick = () => this.fetchCurrentLocation();
                this.map.getContainer().appendChild(locationButton);
            },

            setMarkerRange () {
                if(!this.rangeSelectField)
                    return ;
                let distance = parseInt(this.rangeSelectField.value || 0 ) ;
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

            // Returns a standard marker element
            defaultIconMarker(markerColor){
                return `<svg xmlns="http://www.w3.org/2000/svg" class="map-icon" fill="${markerColor}" width="32" height="32" viewBox="0 0 24 24"><path d="M12 0c-4.198 0-8 3.403-8 7.602 0 4.198 3.469 9.21 8 16.398 4.531-7.188 8-12.2 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z"/></svg>`;
            },

            updateMarker() {
                if (config.showMarker) {
                    this.marker.setLatLng(this.getCoordinates());
                    this.setMarkerRange();
                }
            },

            // Function used for live updated after map rendered
            // and user set map position on PageResource
            updateMapLocation(lat, lng, fix) {
                if (this.marker) {
                    this.marker.setLatLng([lat, lng]);
                    this.markerShouldMoveWithMap = !fix;
                }
            },

            // Function used for live update icon based on
            // category selected in Filament Resource
            // To use this is necessary encode image with base64
            updateMarkerIcon(base64Icon) {
                if (this.marker) {
                    let newIcon;
                    if (base64Icon[0]['icon']) {
                        newIcon = LF.icon({
                            iconUrl: base64Icon[0]['icon'],
                            iconSize: [config.iconSize, config.iconSize]
                        });
                    } else {
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
            fetchInitialCategoryIcon(icon) {
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
            captureAndUploadMapImage(){
                const mapContainer = this.map.getContainer();

                toBlob(mapContainer, {
                    filter: (element) => {
                            if (element.classList && element.classList.contains('leaflet-control-container')){
                                return false;
                            }
                            return true;
                        },
                        width: mapContainer.offsetWidth,
                        height: mapContainer.offsetHeight
                    }).then((blob) => {

                        if(!blob || !(blob instanceof Blob)){
                            throw new Error('domtoimage did not return a valid blob object');
                        }

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
                                    alert('Error uploading map image:' + data.message);
                                }
                            })
                            .catch((error) => {
                                console.error('Error uploading map image:', error);
                                alert('Error capturing map image:' + error);
                            });
                    }).catch((error) => {
                        console.error('Error capturing map image:', error);
                        alert('Error capturing map image:' + error);
                    });
            },

            // Function to create shapes based in the geojson file from filament file field
            loadGeoJsonDataFromFile(data) {
                this._loadGeoJSON(data[0]);
            },

            refreshMap() {
                this.map.flyTo(this.getCoordinates());
                this.updateMarker();
            },

            init() {
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
        };
    };
    window.dispatchEvent(new CustomEvent('map-script-loaded'));
});
