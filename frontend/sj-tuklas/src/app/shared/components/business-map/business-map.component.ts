import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  output,
} from '@angular/core';

import * as L from 'leaflet';

import { Business } from '../../../core/models/business';

/**
 * =====================================================
 * MAP LOCATION MODEL
 * =====================================================
 */
export interface MapLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  image?: string;
}

/**
 * =====================================================
 * COORDINATES
 * =====================================================
 */
export interface MapCoordinates {
  lat: number;
  lng: number;
}

/**
 * =====================================================
 * ROUTE DATA
 * =====================================================
 */
export interface MapRouteData {
  distance: number;
  duration: number;
}

/**
 * =====================================================
 * ROUTE RESPONSE
 * =====================================================
 */
interface OsrmRouteResponse {
  code: string;
  routes?: OsrmRoute[];
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry?: {
    coordinates?: unknown[];
  };
}

/**
 * =====================================================
 * BUSINESS MAP
 * =====================================================
 */
@Component({
  selector: 'app-business-map',
  standalone: true,
  imports: [],
  templateUrl: './business-map.component.html',
  styleUrl: './business-map.component.scss',
})
export class BusinessMapComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('mapContainer', { static: true })
  private mapContainer!: ElementRef<HTMLDivElement>;

  // =====================================================
  // DATA
  // =====================================================

  @Input() businesses: Business[] = [];

  @Input() locations: MapLocation[] = [];

  // =====================================================
  // LOCATION PICKER
  // =====================================================

  @Input() locationPicker = false;

  @Input() selectedLatitude?: number;

  @Input() selectedLongitude?: number;

  @Input() selectedBarangay?: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
  };

  // =====================================================
  // DIRECTIONS MODE
  // =====================================================

  @Input() directionsMode = false;

  @Input() userLocation?: MapCoordinates;

  @Input() destination?: Business | null;

  @Input() nearbyBusinesses: Business[] = [];

  @Input() showNearbyBusinesses = true;

  @Input() autoFitRoute = true;

  @Input() animateRoute = true;

  @Input() routeColor = '#111111';

  @Input() routeAccentColor = '#22c55e';

  @Input() routeWidth = 10;

  @Input() animatedRouteWidth = 6;

  @Input() routeAnimationDuration = 1800;

  @Input() showControls = true;

  @Input() showLegend = true;

  @Input() enable3D = true;

  private is3D = false;

  toggle3D(): void {
    if (!this.map || !this.enable3D) {
      return;
    }

    this.is3D = !this.is3D;

    this.map.getContainer().classList.toggle('sj-map-3d', this.is3D);
  }

  set3D(enabled: boolean): void {
    if (!this.map || !this.enable3D) {
      return;
    }

    this.is3D = enabled;

    this.map.getContainer().classList.toggle('sj-map-3d', enabled);
  }

  // =====================================================
  // OUTPUTS
  // =====================================================

  readonly businessSelected = output<Business>();

  readonly locationSelected = output<MapLocation>();

  readonly locationPicked = output<{
    latitude: number;
    longitude: number;
  }>();

  readonly routeLoaded = output<MapRouteData>();

  readonly routeError = output<string>();

  readonly mapReady = output<L.Map>();

  // =====================================================
  // MAP STATE
  // =====================================================

  private map?: L.Map;

  private markers: L.Marker[] = [];

  private selectedMarker?: L.Marker;

  private userMarker?: L.Marker;

  private destinationMarker?: L.Marker;

  private nearbyMarkers: L.Marker[] = [];

  private routeLine?: L.Polyline;

  private animatedRouteLine?: L.Polyline;

  private legend?: L.Control;

  private animationFrameId?: number;

  private routeCoordinates: L.LatLngExpression[] = [];

  private routeRequest?: AbortController;

  // =====================================================
  // DEFAULT MAP
  // =====================================================

  private readonly defaultCenter: L.LatLngExpression = [12.352, 121.067];

  private readonly defaultZoom = 14;

  // =====================================================
  // CATEGORY MARKER CONFIG
  // =====================================================

  private readonly categoryStyles: Record<
    string,
    {
      color: string;
      icon: string;
      label: string;
    }
  > = {
    'foods & drinks': {
      color: '#f97316',
      icon: 'bx-restaurant',
      label: 'Foods & Drinks',
    },

    shops: {
      color: '#3b82f6',
      icon: 'bx-shopping-bag',
      label: 'Shops',
    },

    services: {
      color: '#8b5cf6',
      icon: 'bx-cog',
      label: 'Services',
    },

    hotels: {
      color: '#16a34a',
      icon: 'bx-hotel',
      label: 'Hotels',
    },

    'boarding houses': {
      color: '#ef4444',
      icon: 'bx-home',
      label: 'Boarding Houses',
    },
  };

  // =====================================================
  // LIFECYCLE
  // =====================================================

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) {
      return;
    }

    const mapDataChanged =
      !!changes['businesses'] ||
      !!changes['locations'] ||
      !!changes['locationPicker'] ||
      !!changes['selectedBarangay'];

    if (mapDataChanged) {
      this.updateMarkers();
    }

    if (
      changes['selectedBarangay'] ||
      changes['selectedLatitude'] ||
      changes['selectedLongitude'] ||
      changes['locationPicker']
    ) {
      this.updateSelectedMarker();
    }

    if (
      changes['directionsMode'] ||
      changes['userLocation'] ||
      changes['destination'] ||
      changes['nearbyBusinesses']
    ) {
      void this.updateDirections();
    }

    if (changes['locationPicker']) {
      this.setupPickerInteraction();
      this.refreshLegend();
    }

    if (
      changes['showLegend'] ||
      changes['showControls'] ||
      changes['directionsMode']
    ) {
      this.refreshLegend();
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  // =====================================================
  // INITIALIZE MAP
  // =====================================================

  private initializeMap(): void {
    if (this.map) {
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement, {
      center: this.defaultCenter,
      zoom: this.defaultZoom,
      zoomControl: true,
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.setupPickerInteraction();

    this.updateMarkers();

    this.updateSelectedMarker();

    this.handleSelectedBarangayChange();

    if (this.directionsMode) {
      void this.updateDirections();
    }

    this.addLegend();

    requestAnimationFrame(() => {
      this.map?.invalidateSize();
      this.mapReady.emit(this.map!);
    });
  }

  // =====================================================
  // DIRECTIONS
  // =====================================================

  private async updateDirections(): Promise<void> {
    if (!this.map || !this.directionsMode) {
      this.clearDirections();
      return;
    }

    this.clearDirections();

    if (!this.userLocation) {
      return;
    }

    if (!this.destination) {
      return;
    }

    const destinationLat = Number(this.destination.latitude);
    const destinationLng = Number(this.destination.longitude);

    if (
      !this.isValidCoordinate(this.userLocation.lat) ||
      !this.isValidCoordinate(this.userLocation.lng) ||
      !this.isValidCoordinate(destinationLat) ||
      !this.isValidCoordinate(destinationLng)
    ) {
      return;
    }

    this.addUserMarker(this.userLocation);

    this.addDestinationMarker(destinationLat, destinationLng, this.destination);

    try {
      await this.drawRoute(
        this.userLocation.lat,
        this.userLocation.lng,
        destinationLat,
        destinationLng,
      );

      if (this.showNearbyBusinesses) {
        this.addNearbyBusinessMarkers(this.nearbyBusinesses);
      }
    } catch (error) {
      if (this.isAbortError(error)) {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Unable to calculate route.';

      console.error('Map route error:', error);

      this.routeError.emit(message);
    }
  }

  // =====================================================
  // DRAW ROUTE
  // =====================================================

  private async drawRoute(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): Promise<void> {
    if (!this.map) {
      return;
    }

    this.routeRequest?.abort();

    this.routeRequest = new AbortController();

    const url =
      'https://router.project-osrm.org/route/v1/driving/' +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      '?overview=full&geometries=geojson';

    const response = await fetch(url, {
      signal: this.routeRequest.signal,
    });

    if (!response.ok) {
      throw new Error(`Routing service returned ${response.status}.`);
    }

    const data = (await response.json()) as OsrmRouteResponse;

    const route = data.routes?.[0];

    if (data.code !== 'Ok' || !route) {
      throw new Error('No driving route was found between these locations.');
    }

    const rawCoordinates = route.geometry?.coordinates;

    if (!Array.isArray(rawCoordinates)) {
      throw new Error('The routing service returned no route geometry.');
    }

    const coordinates = this.parseRouteCoordinates(rawCoordinates);

    if (coordinates.length < 2) {
      throw new Error('The route contains insufficient coordinates.');
    }

    this.routeCoordinates = coordinates;

    const routeData: MapRouteData = {
      distance: Number(route.distance) / 1000,
      duration: Number(route.duration) / 60,
    };

    this.routeLine = L.polyline(coordinates, {
      color: this.routeColor,
      weight: this.routeWidth,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false,
    }).addTo(this.map);

    this.animatedRouteLine = L.polyline([], {
      color: this.routeAccentColor,
      weight: this.animatedRouteWidth,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false,
    }).addTo(this.map);

    if (this.autoFitRoute) {
      this.fitRoute();
    }

    this.routeLoaded.emit(routeData);

    if (this.animateRoute) {
      await this.animateRouteLine(coordinates);
    } else {
      this.animatedRouteLine.setLatLngs(coordinates);
    }
  }

  // =====================================================
  // PARSE ROUTE
  // =====================================================

  private parseRouteCoordinates(points: unknown[]): L.LatLngExpression[] {
    return points
      .filter(
        (point): point is [number, number] =>
          Array.isArray(point) &&
          point.length >= 2 &&
          Number.isFinite(Number(point[0])) &&
          Number.isFinite(Number(point[1])),
      )
      .map(([lng, lat]) => [Number(lat), Number(lng)] as L.LatLngExpression);
  }

  // =====================================================
  // ROUTE ANIMATION
  // =====================================================

  private animateRouteLine(coordinates: L.LatLngExpression[]): Promise<void> {
    return new Promise((resolve) => {
      if (!this.map || !this.animatedRouteLine) {
        resolve();
        return;
      }

      this.stopRouteAnimation();

      const totalPoints = coordinates.length;

      if (totalPoints < 2) {
        this.animatedRouteLine.setLatLngs(coordinates);
        resolve();
        return;
      }

      const startTime = performance.now();

      const animate = (currentTime: number): void => {
        if (!this.map || !this.animatedRouteLine) {
          resolve();
          return;
        }

        const elapsed = currentTime - startTime;

        const progress = Math.min(elapsed / this.routeAnimationDuration, 1);

        const eased = 1 - Math.pow(1 - progress, 3);

        const pointCount = Math.max(2, Math.floor(eased * totalPoints));

        this.animatedRouteLine.setLatLngs(coordinates.slice(0, pointCount));

        if (progress < 1) {
          this.animationFrameId = requestAnimationFrame(animate);

          return;
        }

        this.animatedRouteLine.setLatLngs(coordinates);

        this.animationFrameId = undefined;

        resolve();
      };

      this.animationFrameId = requestAnimationFrame(animate);
    });
  }

  // =====================================================
  // FIT ROUTE
  // =====================================================

  fitRoute(): void {
    if (!this.map || this.routeCoordinates.length < 2) {
      return;
    }

    const bounds = L.latLngBounds(this.routeCoordinates);

    this.map.fitBounds(bounds, {
      padding: [70, 70],
      maxZoom: 16,
      animate: true,
    });
  }

  // =====================================================
  // USER MARKER
  // =====================================================

  private addUserMarker(location: MapCoordinates): void {
    if (!this.map) {
      return;
    }

    this.userMarker?.remove();

    const icon = L.divIcon({
      className: 'sj-user-marker-wrapper',

      html: `
        <div class="sj-user-marker">
          <div class="sj-user-marker-pulse"></div>
          <div class="sj-user-marker-dot"></div>
        </div>
      `,

      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    this.userMarker = L.marker([location.lat, location.lng], {
      icon,
      zIndexOffset: 1000,
    }).addTo(this.map).bindPopup(`
        <div class="sj-popup">
          <strong>Your location</strong>
          <span>Starting point</span>
        </div>
      `);
  }

  // =====================================================
  // DESTINATION MARKER
  // =====================================================

  private addDestinationMarker(
    latitude: number,
    longitude: number,
    business: Business,
  ): void {
    if (!this.map) {
      return;
    }

    this.destinationMarker?.remove();

    const icon = L.divIcon({
      className: 'sj-destination-marker-wrapper',

      html: `
        <div class="sj-destination-marker">
          <i class="bx bx-store-alt"></i>
        </div>
      `,

      iconSize: [44, 52],
      iconAnchor: [22, 52],
      popupAnchor: [0, -48],
    });

    this.destinationMarker = L.marker([latitude, longitude], {
      icon,
      zIndexOffset: 1200,
    }).addTo(this.map).bindPopup(`
        <div class="sj-popup sj-business-popup">
          <strong>
            ${this.escapeHtml(business.name)}
          </strong>

          <span>
            ${this.escapeHtml(business.category || 'Business')}
          </span>
        </div>
      `);
  }

  // =====================================================
  // NEARBY BUSINESSES
  // =====================================================

  private addNearbyBusinessMarkers(businesses: Business[]): void {
    if (!this.map) {
      return;
    }

    this.clearNearbyMarkers();

    for (const business of businesses) {
      const latitude = Number(business.latitude);
      const longitude = Number(business.longitude);

      if (
        !this.isValidCoordinate(latitude) ||
        !this.isValidCoordinate(longitude)
      ) {
        continue;
      }

      const marker = L.marker([latitude, longitude], {
        icon: this.createNearbyIcon(),
        zIndexOffset: 500,
      }).addTo(this.map).bindPopup(`
          <div class="sj-popup">
            <strong>
              ${this.escapeHtml(business.name)}
            </strong>

            <span>
              ${this.escapeHtml(business.category || 'Business')}
            </span>

            <button
              type="button"
              class="sj-popup-link"
              data-nearby-business-id="${this.escapeHtml(business.id)}"
            >
              View business
            </button>
          </div>
        `);

      marker.on('popupopen', (event) => {
        const element = event.popup.getElement();

        const button = element?.querySelector<HTMLButtonElement>(
          '[data-nearby-business-id]',
        );

        button?.addEventListener(
          'click',
          () => {
            this.businessSelected.emit(business);
          },
          { once: true },
        );
      });

      this.nearbyMarkers.push(marker);
    }
  }

  // =====================================================
  // NEARBY ICON
  // =====================================================

  private createNearbyIcon(): L.DivIcon {
    return L.divIcon({
      className: 'sj-nearby-marker-wrapper',

      html: `
        <div class="sj-nearby-marker">
          <i class="bx bx-store"></i>
        </div>
      `,

      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18],
    });
  }

  // =====================================================
  // FOCUS BUSINESS
  // =====================================================

  focusBusiness(business: Business): void {
    if (!this.map) {
      return;
    }

    const latitude = Number(business.latitude);
    const longitude = Number(business.longitude);

    if (
      !this.isValidCoordinate(latitude) ||
      !this.isValidCoordinate(longitude)
    ) {
      return;
    }

    this.map.flyTo([latitude, longitude], 17, {
      duration: 1,
    });

    const marker = this.nearbyMarkers.find((item) => {
      const position = item.getLatLng();

      return (
        Math.abs(position.lat - latitude) < 0.000001 &&
        Math.abs(position.lng - longitude) < 0.000001
      );
    });

    marker?.openPopup();
  }

  // =====================================================
  // CENTER DESTINATION
  // =====================================================

  centerDestination(): void {
    if (!this.map || !this.destination) {
      return;
    }

    const latitude = Number(this.destination.latitude);
    const longitude = Number(this.destination.longitude);

    if (
      !this.isValidCoordinate(latitude) ||
      !this.isValidCoordinate(longitude)
    ) {
      return;
    }

    this.map.flyTo([latitude, longitude], 17, {
      duration: 1,
    });

    this.destinationMarker?.openPopup();
  }

  // =====================================================
  // CLEAR DIRECTIONS
  // =====================================================

  private clearDirections(): void {
    this.routeRequest?.abort();

    this.stopRouteAnimation();

    this.routeLine?.remove();
    this.animatedRouteLine?.remove();

    this.userMarker?.remove();
    this.destinationMarker?.remove();

    this.clearNearbyMarkers();

    this.routeLine = undefined;
    this.animatedRouteLine = undefined;
    this.userMarker = undefined;
    this.destinationMarker = undefined;

    this.routeCoordinates = [];
  }

  // =====================================================
  // STOP ANIMATION
  // =====================================================

  private stopRouteAnimation(): void {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);

      this.animationFrameId = undefined;
    }
  }

  // =====================================================
  // PICKER
  // =====================================================

  private setupPickerInteraction(): void {
    if (!this.map) {
      return;
    }

    this.map.off('click', this.handleMapClick, this);

    if (!this.locationPicker) {
      return;
    }

    this.map.on('click', this.handleMapClick, this);
  }

  private handleMapClick(event: L.LeafletMouseEvent): void {
    if (!this.locationPicker || !this.selectedBarangay) {
      return;
    }

    this.setSelectedLocation(event.latlng.lat, event.latlng.lng);
  }

  private setSelectedLocation(latitude: number, longitude: number): void {
    if (!this.map) {
      return;
    }

    this.removeSelectedMarker();

    const marker = this.createSelectedMarker(latitude, longitude);

    marker.addTo(this.map);

    this.selectedMarker = marker;

    this.emitSelectedLocation(marker);
  }

  private createSelectedMarker(latitude: number, longitude: number): L.Marker {
    const marker = L.marker([latitude, longitude], {
      icon: this.createPickerIcon(),
      draggable: true,
      keyboard: true,
      title: 'Business location',
      alt: 'Selected business location',
    });

    marker.on('dragend', () => {
      this.emitSelectedLocation(marker);
    });

    return marker;
  }

  private emitSelectedLocation(marker: L.Marker): void {
    const position = marker.getLatLng();

    this.locationPicked.emit({
      latitude: position.lat,
      longitude: position.lng,
    });
  }

  // =====================================================
  // SELECTED MARKER
  // =====================================================

  private updateSelectedMarker(): void {
    if (!this.map || !this.locationPicker) {
      this.removeSelectedMarker();
      return;
    }

    if (
      !this.isValidCoordinate(this.selectedLatitude) ||
      !this.isValidCoordinate(this.selectedLongitude)
    ) {
      this.removeSelectedMarker();
      return;
    }

    const latitude = this.selectedLatitude!;
    const longitude = this.selectedLongitude!;

    if (this.selectedMarker) {
      this.selectedMarker.setLatLng([latitude, longitude]);

      return;
    }

    const marker = this.createSelectedMarker(latitude, longitude);

    marker.addTo(this.map);

    this.selectedMarker = marker;
  }

  private removeSelectedMarker(): void {
    this.selectedMarker?.remove();

    this.selectedMarker = undefined;
  }

  // =====================================================
  // PICKER ICON
  // =====================================================

  private createPickerIcon(): L.DivIcon {
    return L.divIcon({
      className: 'sj-picker-marker-wrapper',

      html: `
        <div class="sj-picker-marker">

          <div class="sj-picker-marker-label">
            <i class="bx bx-store-alt"></i>
            <span>Your business</span>
          </div>

          <div class="sj-picker-marker-pin">
            <i class="bx bx-map-pin"></i>
          </div>

          <div class="sj-picker-marker-shadow"></div>

        </div>
      `,

      iconSize: [150, 78],
      iconAnchor: [75, 72],
      popupAnchor: [0, -70],
    });
  }

  // =====================================================
  // SELECTED BARANGAY
  // =====================================================

  private handleSelectedBarangayChange(): void {
    if (!this.map || !this.selectedBarangay) {
      return;
    }

    if (
      !this.isValidCoordinate(this.selectedBarangay.latitude) ||
      !this.isValidCoordinate(this.selectedBarangay.longitude)
    ) {
      return;
    }

    this.map.setView(
      [this.selectedBarangay.latitude, this.selectedBarangay.longitude],
      16,
      {
        animate: true,
      },
    );
  }

  // =====================================================
  // UPDATE MARKERS
  // =====================================================

  private updateMarkers(): void {
    if (!this.map) {
      return;
    }

    this.clearMarkers();

    if (this.directionsMode) {
      return;
    }

    if (this.locationPicker) {
      this.updatePickerMap();
      return;
    }

    if (this.locations.length > 0) {
      this.updateLocationMarkers();
      return;
    }

    this.updateBusinessMarkers();
  }

  // =====================================================
  // PICKER MAP
  // =====================================================

  private updatePickerMap(): void {
    if (!this.map) {
      return;
    }

    if (!this.selectedBarangay) {
      this.map.setView(this.defaultCenter, this.defaultZoom);

      return;
    }

    const { latitude, longitude, id, name } = this.selectedBarangay;

    if (
      !this.isValidCoordinate(latitude) ||
      !this.isValidCoordinate(longitude)
    ) {
      return;
    }

    const marker = L.marker([latitude, longitude], {
      icon: this.createLocationIcon({
        id,
        name,
        latitude,
        longitude,
      }),
      keyboard: true,
      title: name,
      alt: name,
    });

    marker.addTo(this.map);

    this.markers.push(marker);

    this.map.setView([latitude, longitude], 16, {
      animate: true,
    });
  }

  // =====================================================
  // BUSINESS MARKERS
  // =====================================================

  private updateBusinessMarkers(): void {
    if (!this.map) {
      return;
    }

    const validBusinesses = this.businesses.filter(
      (business) =>
        this.isValidCoordinate(Number(business.latitude)) &&
        this.isValidCoordinate(Number(business.longitude)),
    );

    if (validBusinesses.length === 0) {
      this.map.setView(this.defaultCenter, this.defaultZoom);

      return;
    }

    const bounds = L.latLngBounds([]);

    for (const business of validBusinesses) {
      const latitude = Number(business.latitude);

      const longitude = Number(business.longitude);

      const marker = L.marker([latitude, longitude], {
        icon: this.createCategoryIcon(business.category),
        keyboard: true,
        title: business.name,
        alt: business.name,
      });

      bounds.extend([latitude, longitude]);

      marker.bindPopup(this.createPopupContent(business), {
        maxWidth: 280,
        minWidth: 250,
        closeButton: true,
        autoPan: true,
      });

      marker.on('popupopen', (event) => {
        this.attachPopupAction(business, event.popup);
      });

      marker.addTo(this.map);

      this.markers.push(marker);
    }

    this.fitMapToBusinesses(validBusinesses, bounds);
  }

  // =====================================================
  // LOCATION MARKERS
  // =====================================================

  private updateLocationMarkers(): void {
    if (!this.map) {
      return;
    }

    const validLocations = this.locations.filter(
      (location) =>
        this.isValidCoordinate(location.latitude) &&
        this.isValidCoordinate(location.longitude),
    );

    if (validLocations.length === 0) {
      this.map.setView(this.defaultCenter, this.defaultZoom);

      return;
    }

    const bounds = L.latLngBounds([]);

    for (const location of validLocations) {
      const marker = L.marker([location.latitude, location.longitude], {
        icon: this.createLocationIcon(location),
        keyboard: true,
        title: location.name,
        alt: location.name,
      });

      bounds.extend([location.latitude, location.longitude]);

      marker.bindPopup(this.createLocationPopup(location), {
        maxWidth: 290,
        minWidth: 240,
        closeButton: true,
        autoPan: true,
      });

      marker.on('popupopen', (event) => {
        this.attachLocationPopupAction(location, event.popup);
      });

      marker.addTo(this.map);

      this.markers.push(marker);
    }

    this.fitMapToLocations(validLocations, bounds);
  }

  // =====================================================
  // CATEGORY ICON
  // =====================================================

  private createCategoryIcon(category: string): L.DivIcon {
    const style = this.getCategoryStyle(category);

    return L.divIcon({
      className: 'sj-category-marker-wrapper',

      html: `
        <div
          class="sj-category-marker"
          style="--marker-color: ${style.color};"
          title="${this.escapeHtml(style.label)}"
        >
          <div class="sj-category-marker-pin">
            <i class="bx ${style.icon}"></i>
          </div>
        </div>
      `,

      iconSize: [42, 50],
      iconAnchor: [21, 48],
      popupAnchor: [0, -46],
    });
  }

  // =====================================================
  // LOCATION ICON
  // =====================================================

  private createLocationIcon(location?: MapLocation): L.DivIcon {
    const name = location?.name ?? 'Barangay';

    return L.divIcon({
      className: 'sj-location-marker-wrapper',

      html: `
        <div
          class="sj-location-marker"
          title="${this.escapeHtml(name)}"
        >
          <div class="sj-location-marker-label">
            ${this.escapeHtml(name)}
          </div>

          <div class="sj-location-marker-pin">
            <i class="bx bx-map-pin"></i>
          </div>
        </div>
      `,

      iconSize: [120, 64],
      iconAnchor: [60, 58],
      popupAnchor: [0, -58],
    });
  }

  // =====================================================
  // CATEGORY STYLE
  // =====================================================

  private getCategoryStyle(category: string): {
    color: string;
    icon: string;
    label: string;
  } {
    const key = category.trim().toLowerCase();

    return (
      this.categoryStyles[key] ?? {
        color: '#6b7280',
        icon: 'bx-map-pin',
        label: category || 'Business',
      }
    );
  }

  // =====================================================
  // BUSINESS POPUP
  // =====================================================

  private createPopupContent(business: Business): string {
    const imageUrl = this.getImageUrl(business.image);

    const style = this.getCategoryStyle(business.category);

    const rating = Number.isFinite(business.rating)
      ? business.rating.toFixed(1)
      : '0.0';

    const reviews = Number.isFinite(business.reviews) ? business.reviews : 0;

    return `
      <div class="sj-map-popup">

        <div class="sj-map-popup-image-wrapper">

          <img
            class="sj-map-popup-image"
            src="${this.escapeHtml(imageUrl)}"
            alt="${this.escapeHtml(business.name)}"
            loading="lazy"
            data-popup-image
          />

          <div
            class="sj-map-popup-image-placeholder"
            data-popup-placeholder
            aria-hidden="true"
          >
            <i class="bx bx-store-alt"></i>
          </div>

        </div>

        <div class="sj-map-popup-content">

          <div
            class="sj-map-popup-category"
            style="color: ${style.color};"
          >
            <i class="bx ${style.icon}"></i>
            ${this.escapeHtml(style.label)}
          </div>

          <div class="sj-map-popup-title">
            ${this.escapeHtml(business.name)}
          </div>

          ${
            business.businessType
              ? `
                <div class="sj-map-popup-type">
                  ${this.escapeHtml(business.businessType)}
                </div>
              `
              : ''
          }

          <div class="sj-map-popup-location">
            <i class="bx bx-map"></i>

            <span>
              ${this.escapeHtml(
                business.location || business.barangay || 'San Jose',
              )}
            </span>
          </div>

          <div class="sj-map-popup-rating">
            <i class="bx bxs-star"></i>

            <strong>
              ${rating}
            </strong>

            <span>
              (${reviews}
              ${reviews === 1 ? 'review' : 'reviews'})
            </span>
          </div>

          <button
            type="button"
            class="sj-map-popup-button"
            data-business-id="${this.escapeHtml(business.id)}"
          >
            <span>View business</span>
            <i class="bx bx-right-arrow-alt"></i>
          </button>

        </div>

      </div>
    `;
  }

  // =====================================================
  // LOCATION POPUP
  // =====================================================

  private createLocationPopup(location: MapLocation): string {
    const imageUrl = this.getImageUrl(location.image);

    return `
      <div class="sj-location-popup">

        <div class="sj-location-popup-image-wrapper">

          <img
            class="sj-location-popup-image"
            src="${this.escapeHtml(imageUrl)}"
            alt="${this.escapeHtml(location.name)}"
            loading="lazy"
            data-popup-image
          />

          <div
            class="sj-location-popup-image-placeholder"
            data-popup-placeholder
            aria-hidden="true"
          >
            <i class="bx bx-map"></i>
          </div>

        </div>

        <div class="sj-location-popup-content">

          <div class="sj-location-popup-label">
            <i class="bx bx-map-pin"></i>
            BARANGAY
          </div>

          <div class="sj-location-popup-title">
            ${this.escapeHtml(location.name)}
          </div>

          <div class="sj-location-popup-location">
            San Jose, Occidental Mindoro
          </div>

          <button
            type="button"
            class="sj-location-popup-button"
            data-location-id="${location.id}"
          >
            <span>Explore area</span>
            <i class="bx bx-right-arrow-alt"></i>
          </button>

        </div>

      </div>
    `;
  }

  // =====================================================
  // POPUP ACTION
  // =====================================================

  private attachPopupAction(business: Business, popup: L.Popup): void {
    const element = popup.getElement();

    if (!element) {
      return;
    }

    const button =
      element.querySelector<HTMLButtonElement>('[data-business-id]');

    const image = element.querySelector<HTMLImageElement>('[data-popup-image]');

    const placeholder = element.querySelector<HTMLElement>(
      '[data-popup-placeholder]',
    );

    this.setupPopupImage(image, placeholder);

    button?.addEventListener(
      'click',
      () => {
        this.businessSelected.emit(business);
      },
      {
        once: true,
      },
    );
  }

  // =====================================================
  // LOCATION POPUP ACTION
  // =====================================================

  private attachLocationPopupAction(
    location: MapLocation,
    popup: L.Popup,
  ): void {
    const element = popup.getElement();

    if (!element) {
      return;
    }

    const button =
      element.querySelector<HTMLButtonElement>('[data-location-id]');

    const image = element.querySelector<HTMLImageElement>('[data-popup-image]');

    const placeholder = element.querySelector<HTMLElement>(
      '[data-popup-placeholder]',
    );

    this.setupPopupImage(image, placeholder);

    button?.addEventListener(
      'click',
      () => {
        this.locationSelected.emit(location);
      },
      {
        once: true,
      },
    );
  }

  // =====================================================
  // IMAGE
  // =====================================================

  private setupPopupImage(
    image: HTMLImageElement | null,
    placeholder: HTMLElement | null,
  ): void {
    if (!image || !placeholder) {
      return;
    }

    placeholder.style.display = 'none';

    image.addEventListener(
      'error',
      () => {
        image.style.display = 'none';
        placeholder.style.display = 'flex';
      },
      {
        once: true,
      },
    );

    if (image.complete && image.naturalWidth === 0) {
      image.style.display = 'none';
      placeholder.style.display = 'flex';
    }
  }

  private getImageUrl(image?: string | null): string {
    return image?.trim() ? image.trim() : '';
  }

  // =====================================================
  // FIT MAP
  // =====================================================

  private fitMapToBusinesses(
    businesses: Business[],
    bounds: L.LatLngBounds,
  ): void {
    if (!this.map) {
      return;
    }

    if (businesses.length === 1) {
      this.map.setView(
        [Number(businesses[0].latitude), Number(businesses[0].longitude)],
        16,
      );

      return;
    }

    this.map.fitBounds(bounds, {
      padding: [70, 70],
      maxZoom: 16,
    });
  }

  private fitMapToLocations(
    locations: MapLocation[],
    bounds: L.LatLngBounds,
  ): void {
    if (!this.map) {
      return;
    }

    if (locations.length === 1) {
      this.map.setView([locations[0].latitude, locations[0].longitude], 15);

      return;
    }

    this.map.fitBounds(bounds, {
      padding: [55, 55],
      maxZoom: 14,
    });
  }

  // =====================================================
  // LEGEND
  // =====================================================

  private addLegend(): void {
    if (!this.map || this.legend || !this.showLegend) {
      return;
    }

    this.legend = new L.Control({
      position: 'bottomright',
    });

    this.legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'sj-map-legend');

      this.renderLegend(div);

      L.DomEvent.disableClickPropagation(div);

      return div;
    };

    this.legend.addTo(this.map);
  }

  private refreshLegend(): void {
    if (!this.map) {
      return;
    }

    if (this.legend && !this.showLegend) {
      this.legend.remove();
      this.legend = undefined;
      return;
    }

    if (!this.legend && this.showLegend) {
      this.addLegend();
      return;
    }

    const element = this.legend?.getContainer();

    if (!element) {
      return;
    }

    this.renderLegend(element);
  }

  private renderLegend(element: HTMLElement): void {
    if (this.directionsMode) {
      element.innerHTML = `
        <div class="sj-map-legend-title">
          Directions
        </div>

        <div class="sj-map-legend-item">
          <span
            class="sj-map-legend-icon"
            style="background: #111111;"
          >
            <i class="bx bx-navigation"></i>
          </span>

          <span>
            Your location
          </span>
        </div>

        <div class="sj-map-legend-item">
          <span
            class="sj-map-legend-icon"
            style="background: #22c55e;"
          >
            <i class="bx bx-route"></i>
          </span>

          <span>
            Driving route
          </span>
        </div>

        <div class="sj-map-legend-item">
          <span
            class="sj-map-legend-icon"
            style="background: #111111;"
          >
            <i class="bx bx-store"></i>
          </span>

          <span>
            Destination
          </span>
        </div>
      `;

      return;
    }

    if (this.locationPicker) {
      element.innerHTML = `
        <div class="sj-map-legend-title">
          Set location
        </div>

        <div class="sj-map-legend-item">
          <span
            class="sj-map-legend-icon"
            style="background: #111111;"
          >
            <i class="bx bx-map-pin"></i>
          </span>

          <span>
            Click or drag pin
          </span>
        </div>
      `;

      return;
    }

    if (this.locations.length > 0) {
      element.innerHTML = `
        <div class="sj-map-legend-title">
          San Jose Areas
        </div>

        <div class="sj-map-legend-item">
          <span
            class="sj-map-legend-icon"
            style="background: #111111;"
          >
            <i class="bx bx-map-pin"></i>
          </span>

          <span>
            Barangay
          </span>
        </div>
      `;

      return;
    }

    element.innerHTML = `
      <div class="sj-map-legend-title">
        Categories
      </div>

      ${Object.values(this.categoryStyles)
        .map(
          (style) => `
            <div class="sj-map-legend-item">
              <span
                class="sj-map-legend-icon"
                style="background: ${style.color};"
              >
                <i class="bx ${style.icon}"></i>
              </span>

              <span>
                ${this.escapeHtml(style.label)}
              </span>
            </div>
          `,
        )
        .join('')}
    `;
  }

  // =====================================================
  // REFRESH
  // =====================================================

  refresh(): void {
    if (!this.map) {
      return;
    }

    requestAnimationFrame(() => {
      this.map?.invalidateSize();

      this.updateMarkers();

      this.updateSelectedMarker();

      this.handleSelectedBarangayChange();

      if (this.directionsMode) {
        void this.updateDirections();
      }
    });
  }

  // =====================================================
  // CLEAR MARKERS
  // =====================================================

  private clearMarkers(): void {
    for (const marker of this.markers) {
      marker.remove();
    }

    this.markers = [];
  }

  private clearNearbyMarkers(): void {
    for (const marker of this.nearbyMarkers) {
      marker.remove();
    }

    this.nearbyMarkers = [];
  }

  // =====================================================
  // VALIDATION
  // =====================================================

  private isValidCoordinate(value: number | undefined | null): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }

  // =====================================================
  // DESTROY
  // =====================================================

  private destroyMap(): void {
    this.routeRequest?.abort();

    this.stopRouteAnimation();

    this.clearMarkers();

    this.clearNearbyMarkers();

    this.removeSelectedMarker();

    this.clearDirections();

    if (this.map) {
      this.map.off('click', this.handleMapClick, this);

      this.map.remove();

      this.map = undefined;
    }

    this.legend = undefined;
  }

  // =====================================================
  // ESCAPE HTML
  // =====================================================

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
