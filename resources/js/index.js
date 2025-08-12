import * as LF from 'leaflet'
import 'leaflet-fullscreen'
import '@geoman-io/leaflet-geoman-free'
import { toBlob } from 'html-to-image';

document.addEventListener('DOMContentLoaded', () => {
    window.mapPicker = ($wire, config, state) => {
        return {
            map: null,
            marker: null,
            rangeCircle: null,
            drawItems: null,
            rangeSelectField: null,
            markerShouldMoveWithMap: false,
            baseLayers: {}, // Object to store base layers
            overlayLayers: {}, // Store the overlay layers control instance
            layersControl: null, // Layers Control position

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
                const zoomLevel = config.controls.zoom || config.zoom() || 13;

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
                    // Note: I can't use doubleClick here because it will interfere with map zoom :-(
                    this.map.on('click', (e) => {
                        this.setCoordinates(e.latlng);
                    });
                }

                // --- Base Layer Setup ---
                if (config.baseLayers && Array.isArray(config.baseLayers) && config.baseLayers.length > 0) {
                    config.baseLayers.forEach(layerConfig => {
                        if (!layerConfig.url) {
                            console.error("Base layer configuration is missing 'url':", layerConfig);
                            alert("Error: Base layer configuration is missing 'url'. See console for details.");
                            return; // Skip this layer
                        }
                        if (!layerConfig.name) {
                            console.warn("Base layer configuration is missing 'name':", layerConfig);
                        }

                        this.baseLayers[layerConfig.name] = LF.tileLayer(layerConfig.url, {
                            attribution: layerConfig.attribution,
                            minZoom: layerConfig.minZoom || 1,
                            maxZoom: layerConfig.maxZoom || 28,
                            tileSize: config.tileSize || 256,
                            zoomOffset: config.zoomOffset,
                            detectRetina: config.detectRetina,
                            opacity: layerConfig.opacity || 1,
                            crossOrigin: true
                        });
                    });

                    // Add the default layer to the map
                    const defaultLayerName = config.defaultBaseLayer || config.baseLayers[0]?.name; // Use optional chaining
                    if (this.baseLayers[defaultLayerName]) {
                        this.baseLayers[defaultLayerName].addTo(this.map);
                    } else {
                        console.warn(`Default base layer "${defaultLayerName}" not found.`);
                        // Use optional chaining and nullish coalescing operator
                        Object.values(this.baseLayers)[0]?.addTo(this.map);
                    }
                } else {
                    // Fallback to a default OpenStreetMap layer if no layers are configured
                    this.baseLayers['OpenStreetMap'] = LF.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: ''
                    }).addTo(this.map);
                }
                // Create the layers control and position, including overlays.  Do this *after* base layers are set up.
                this.layersControl = LF.control.layers(this.baseLayers, this.overlayLayers, { position: 'bottomleft' }).addTo(this.map);

                // --- Overlay Layer Setup ---
                if (config.overlayLayers && Array.isArray(config.overlayLayers) && config.overlayLayers.length > 0) {
                    config.overlayLayers.forEach(layerConfig => {
                        if (!layerConfig.url && layerConfig.type !== 'api') {
                            console.error("Overlay layer configuration is missing 'url':", layerConfig);
                            return; // Skip this layer
                        }
                        if (!layerConfig.name) {
                            console.warn("Overlay layer configuration is missing 'name':", layerConfig);
                        }

                        let overlayLayer;

                        if (layerConfig.type === 'api') {
                            const preloadedItems = new LF.FeatureGroup();
                            const apiData = layerConfig.data;
                            console.log(apiData);
                            // Defensive checks:
                            if (!apiData || !Array.isArray(apiData.features)) {
                                console.warn('No valid features found in API data:', apiData);
                            } else {
                                // For each item in apiData.features
                                apiData.features.forEach((item, index) => {
                                    if (item.coordinates) {
                                        LF.geoJSON(item.coordinates, {
                                            style: {
                                                color: 'Red',
                                                fillColor: 'Black',
                                                fillOpacity: 0.0
                                            },
                                        }).addTo(preloadedItems);
                                    } else {
                                        console.warn(`API feature at index ${index} has no valid "coordinates" property.`, item);
                                    }
                                });
                            }

                            // Add to overlay
                            this.overlayLayers[layerConfig.name] = preloadedItems;
                            this.layersControl.addOverlay(preloadedItems, layerConfig.name);

                            // Make visible if user wants
                            if (layerConfig.visibleByDefault) {
                                preloadedItems.addTo(this.map);
                            }

                        } else if (layerConfig.type === 'geojson') {
                            fetch(layerConfig.url)
                                .then(data => {
                                    console.log('geojson', data)
                                    overlayLayer = LF.geoJSON(data, {
                                        style: layerConfig.style || {},
                                        onEachFeature: layerConfig.onEachFeature,
                                    });

                                    this.overlayLayers[layerConfig.name] = overlayLayer; // Store in the overlayLayers object
                                    this.layersControl.addOverlay(overlayLayer, layerConfig.name); // Add to the *control*

                                    // Add to the map *only* if visibleByDefault is true
                                    if (layerConfig.visibleByDefault) {
                                        overlayLayer.addTo(this.map);
                                    }
                                })
                                .catch(error => {
                                    console.error("Error loading GeoJSON layer:", error);
                                    alert("Error loading GeoJSON layer: " + error.message); // User-friendly error
                                });

                        } else {
                            // Assume it's a tile layer
                            overlayLayer = LF.tileLayer(layerConfig.url, {
                                attribution: layerConfig.attribution,
                                minZoom: layerConfig.minZoom || 1,  //Use defaults for min and max zoom
                                maxZoom: layerConfig.maxZoom || 28,
                                tileSize: config.tileSize || 256,
                                zoomOffset: config.zoomOffset,
                                detectRetina: config.detectRetina,
                                opacity: layerConfig.opacity || 1,
                                crossOrigin: true,
                            });

                            this.overlayLayers[layerConfig.name] = overlayLayer; // Store in the overlayLayers object
                            this.layersControl.addOverlay(overlayLayer, layerConfig.name); // Add to the *control*

                            // Add to the map *only* if visibleByDefault is true
                            if (layerConfig.visibleByDefault) {
                                overlayLayer.addTo(this.map);
                            }
                        }
                    });
                }

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
                    this.map.pm.addControls(config.geoManToolbar);

                    this.map.pm.setPathOptions({
                        color: config.borderColor || '#FFFFFF',
                        fillColor: config.fillColor || '#FFFFFF',
                        fillOpacity: 0.5
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
                                    color: config.borderColor || '#FFFFFF',
                                    fillColor: config.fillColor || '#FFFFFF',
                                    fillOpacity: 0.5
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
                if(!this.rangeSelectField) {
                    return ;
                }

                let distance = parseInt(this.rangeSelectField.value || 0 ) ;

                if (this.rangeCircle) {
                    this.rangeCircle.setLatLng(this.getCoordinates()).setRadius(distance);
                } else {
                    this.rangeCircle = LF.circle(this.getCoordinates(), {
                        color: '#3b82f6',
                        fillColor: '#f03',
                        fillOpacity: 0.5,
                        radius: distance // The radius in meters
                    }).addTo(this.map);
                }
            },

            // Returns a standard svg marker
            defaultIconMarker: function(markerColor){
                return `<svg xmlns="http://www.w3.org/2000/svg" class="map-icon" fill="${markerColor}" width="32" height="32" viewBox="0 0 24 24"><path d="M12 0c-4.198 0-8 3.403-8 7.602 0 4.198 3.469 9.21 8 16.398 4.531-7.188 8-12.2 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z"/></svg>`;
            },

            updateMarker: function() {
                if (config.showMarker && this.marker) {
                    this.marker.setLatLng(this.getCoordinates());
                    this.setMarkerRange();
                    this.updateLocation();
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
                    width: mapContainer.offsetWidth,
                    height: mapContainer.offsetHeight
                }).then((blob) => {

                    if(!blob || !(blob instanceof Blob)){
                        throw new Error('Image snapshot did not return a valid blob object');
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
                            } else {
                                console.error('Error uploading map image:', data.message);
                                alert('Error uploading map image:'+ data.message);
                            }
                        }).catch((error) => {
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
                            color: config.borderColor || '#FFFFFF',
                            fillColor: config.fillColor || '#FFFFFF',
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
            },

            init: function() {
                this.$wire = $wire;
                this.config = config;
                this.state = state;
                this.rangeSelectField = document.getElementById(config.rangeSelectField || 'data.distance');

                $wire.on('refreshMap', this.refreshMap.bind(this));
                $wire.on('captureMapImage', () => { this.captureAndUploadMapImage(); });
                $wire.on('updateMarkerIcon', (icon) => { this.updateMarkerIcon(icon); });
                $wire.on('loadGeoJsonDataFromFile', (data) => { this.loadGeoJsonDataFromFile(data); });

                $wire.on('updateMapLocation', (coordinates) => {
                    const { lat, lng, fix } = coordinates[0];
                    this.updateMapLocation(lat,lng,fix);
                });
            }
        };
    };
    window.dispatchEvent(new CustomEvent('map-script-loaded'));
});
