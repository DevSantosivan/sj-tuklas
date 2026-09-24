import {
  AfterViewInit,
  Component,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';

import { BusinessService } from '../../../../core/services/business.service';
import { Business } from '../../../../core/models/business';

import {
  BusinessMapComponent,
  MapCoordinates,
  MapRouteData,
} from '../../../../shared/components/business-map/business-map.component';

interface Coordinates {
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-directions',
  standalone: true,
  imports: [RouterLink, BusinessMapComponent],
  templateUrl: './directions.component.html',
  styleUrl: './directions.component.scss',
})
export class DirectionsComponent implements AfterViewInit {
  private readonly route = inject(ActivatedRoute);

  private readonly businessService = inject(BusinessService);

  // ============================================================
  // MAP COMPONENT
  // ============================================================

  @ViewChild('businessMap')
  private businessMap?: BusinessMapComponent;

  // ============================================================
  // STATE
  // ============================================================

  readonly business = signal<Business | null>(null);

  readonly nearbyBusinesses = signal<Business[]>([]);

  readonly loading = signal(true);

  readonly nearbyLoading = signal(false);

  readonly error = signal<string | null>(null);

  readonly userLocation = signal<Coordinates | null>(null);

  readonly distance = signal<number | null>(null);

  readonly duration = signal<number | null>(null);

  readonly routeReady = signal(false);

  readonly is3D = signal(false);

  // ============================================================
  // LIFECYCLE
  // ============================================================

  async ngAfterViewInit(): Promise<void> {
    await this.loadDirections();
  }

  // ============================================================
  // LOAD DIRECTIONS
  // ============================================================

  private async loadDirections(): Promise<void> {
    this.loading.set(true);

    this.error.set(null);

    this.routeReady.set(false);

    try {
      const businessId = this.getBusinessId();

      // ----------------------------------------------------------
      // USER LOCATION
      // ----------------------------------------------------------

      const location = await this.getStartLocation();

      this.userLocation.set(location);

      // ----------------------------------------------------------
      // BUSINESS
      // ----------------------------------------------------------

      const business = await this.businessService.getBusinessById(businessId);

      if (!business) {
        throw new Error('Business not found.');
      }

      this.business.set(business);

      // ----------------------------------------------------------
      // NEARBY BUSINESSES
      // ----------------------------------------------------------

      void this.loadNearbyBusinesses(location.lat, location.lng, business.id);
    } catch (error) {
      console.error('Directions error:', error);

      this.error.set(
        error instanceof Error ? error.message : 'Unable to load directions.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  // ============================================================
  // BUSINESS ID
  // ============================================================

  private getBusinessId(): string {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      throw new Error('Business ID is missing.');
    }

    return id;
  }

  // ============================================================
  // START LOCATION
  // ============================================================

  private async getStartLocation(): Promise<Coordinates> {
    const fromLat = Number(this.route.snapshot.queryParamMap.get('fromLat'));

    const fromLng = Number(this.route.snapshot.queryParamMap.get('fromLng'));

    // ----------------------------------------------------------
    // URL LOCATION
    // ----------------------------------------------------------

    if (this.isValidCoordinates(fromLat, fromLng)) {
      return {
        lat: fromLat,
        lng: fromLng,
      };
    }

    // ----------------------------------------------------------
    // DEVICE LOCATION
    // ----------------------------------------------------------

    return this.getCurrentLocation();
  }

  // ============================================================
  // CURRENT LOCATION
  // ============================================================

  private getCurrentLocation(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));

        return;
      }

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const latitude = coords.latitude;

          const longitude = coords.longitude;

          if (!this.isValidCoordinates(latitude, longitude)) {
            reject(new Error('Your current location could not be determined.'));

            return;
          }

          resolve({
            lat: latitude,
            lng: longitude,
          });
        },

        (error) => {
          console.error('Geolocation error:', error);

          reject(
            new Error(
              'Location permission is required to calculate directions.',
            ),
          );
        },

        {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 30_000,
        },
      );
    });
  }

  // ============================================================
  // NEARBY BUSINESSES
  // ============================================================

  private async loadNearbyBusinesses(
    latitude: number,
    longitude: number,
    currentBusinessId: string,
  ): Promise<void> {
    this.nearbyLoading.set(true);

    try {
      const businesses = await this.businessService.getBusinesses();

      const nearby = businesses
        .filter(
          (business) =>
            business.id !== currentBusinessId &&
            this.hasValidBusinessCoordinates(business),
        )
        .map((business) => ({
          business,
          distance: this.calculateDistance(
            latitude,
            longitude,
            Number(business.latitude),
            Number(business.longitude),
          ),
        }))
        .filter(({ distance }) => distance <= 5)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10)
        .map(({ business }) => business);

      this.nearbyBusinesses.set(nearby);
    } catch (error) {
      console.error('Nearby businesses error:', error);
    } finally {
      this.nearbyLoading.set(false);
    }
  }

  // ============================================================
  // MAP EVENTS
  // ============================================================

  onRouteLoaded(route: MapRouteData): void {
    this.distance.set(route.distance);

    this.duration.set(route.duration);

    this.routeReady.set(true);

    this.error.set(null);
  }

  onRouteError(message: string): void {
    this.routeReady.set(false);

    this.distance.set(null);

    this.duration.set(null);

    this.error.set(message);
  }

  onBusinessSelected(business: Business): void {
    this.focusBusiness(business);
  }

  // ============================================================
  // MAP CONTROLS
  // ============================================================

  recenterRoute(): void {
    this.businessMap?.fitRoute();
  }

  centerDestination(): void {
    this.businessMap?.centerDestination();
  }

  focusBusiness(business: Business): void {
    this.businessMap?.focusBusiness(business);
  }

  toggle3D(): void {
    this.is3D.update((value) => !value);
    this.businessMap?.set3D(this.is3D());
  }

  // ============================================================
  // FORMAT DURATION
  // ============================================================

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);

    const remainingMinutes = Math.round(minutes % 60);

    if (hours <= 0) {
      return `${remainingMinutes} min`;
    }

    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  // ============================================================
  // DISTANCE
  // ============================================================

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const earthRadius = 6371;

    const dLat = this.toRadians(lat2 - lat1);

    const dLng = this.toRadians(lng2 - lng1);

    const lat1Radians = this.toRadians(lat1);

    const lat2Radians = this.toRadians(lat2);

    const sinLat = Math.sin(dLat / 2);

    const sinLng = Math.sin(dLng / 2);

    const a =
      sinLat * sinLat +
      Math.cos(lat1Radians) * Math.cos(lat2Radians) * sinLng * sinLng;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // ============================================================
  // VALIDATION
  // ============================================================

  private isValidCoordinates(lat: number, lng: number): boolean {
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  private hasValidBusinessCoordinates(business: Business): boolean {
    return this.isValidCoordinates(
      Number(business.latitude),
      Number(business.longitude),
    );
  }
}
