import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';

import {
  BusinessMapComponent,
  MapLocation,
} from '../../../../shared/components/business-map/business-map.component';

import { Business } from '../../../../core/models/business';
import { BUSINESSES } from '../../../../core/data/business.data';
import { BARANGAYS } from '../../../../core/data/barangay.data';
import { BarangayMapService } from '../../../../core/services/barangay-map.service';

@Component({
  selector: 'app-locations-page',
  standalone: true,
  imports: [RouterLink, SearchBarComponent, BusinessMapComponent],
  templateUrl: './locations-page.component.html',
  styleUrl: './locations-page.component.scss',
})
export class LocationsPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly barangayMapService = inject(BarangayMapService);

  // =====================================================
  // SEARCH
  // =====================================================

  searchTerm = signal('');

  // =====================================================
  // BARANGAYS
  // =====================================================

  readonly locations = BARANGAYS;

  // =====================================================
  // MAP LOCATIONS
  // =====================================================

  readonly mapLocations = signal<MapLocation[]>(
    BARANGAYS.map((barangay) => ({
      id: barangay.id,
      name: barangay.name,
      latitude: barangay.latitude,
      longitude: barangay.longitude,
      image: barangay.image,
    })),
  );

  // =====================================================
  // BUSINESSES
  // =====================================================

  readonly mapBusinesses: Business[] = BUSINESSES;

  // =====================================================
  // FILTERED LOCATIONS
  // =====================================================

  readonly filteredLocations = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    if (!search) {
      return this.locations;
    }

    return this.locations.filter((location) =>
      location.name.toLowerCase().includes(search),
    );
  });

  // =====================================================
  // FILTERED MAP LOCATIONS
  // =====================================================

  readonly filteredMapLocations = computed(() => {
    const filteredIds = new Set(
      this.filteredLocations().map((location) => location.id),
    );

    return this.mapLocations().filter((location) =>
      filteredIds.has(location.id),
    );
  });

  // =====================================================
  // LIFECYCLE
  // =====================================================

  ngOnInit(): void {
    this.loadBarangayBoundaries();
  }

  // =====================================================
  // LOAD DENR GEOJSON
  // =====================================================

  private loadBarangayBoundaries(): void {
    this.barangayMapService.getBarangayBoundaries().subscribe({
      next: (response: unknown) => {
        console.log('DENR GeoJSON response:', response);

        if (!this.isGeoJsonFeatureCollection(response)) {
          console.warn(
            'DENR response is not a valid GeoJSON FeatureCollection. ' +
              'Keeping the existing barangay coordinates.',
          );
          return;
        }

        console.log('DENR feature count:', response.features.length);

        console.log(
          'First feature properties:',
          response.features[0]?.properties,
        );

        console.log('First feature geometry:', response.features[0]?.geometry);

        // Do not replace coordinates until the feature properties
        // and municipality have been verified.
      },
      error: (error: unknown) => {
        console.error(
          'Failed to load DENR barangay boundaries. ' +
            'Keeping the existing coordinates.',
          error,
        );
      },
    });
  }

  // =====================================================
  // GEOJSON VALIDATION
  // =====================================================

  private isGeoJsonFeatureCollection(value: unknown): value is {
    type: 'FeatureCollection';
    features: Array<{
      type?: string;
      properties?: Record<string, unknown> | null;
      geometry?: {
        type?: string;
        coordinates?: unknown;
      } | null;
    }>;
  } {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as {
      type?: unknown;
      features?: unknown;
    };

    return (
      candidate.type === 'FeatureCollection' &&
      Array.isArray(candidate.features)
    );
  }

  // =====================================================
  // APPLY VERIFIED COORDINATES
  // =====================================================

  private applyBarangayCoordinates(coordinates: MapLocation[]): void {
    const coordinateById = new Map(
      coordinates.map((location) => [location.id, location]),
    );

    this.mapLocations.update((current) =>
      current.map((location) => {
        const updated = coordinateById.get(location.id);

        if (
          !updated ||
          !Number.isFinite(updated.latitude) ||
          !Number.isFinite(updated.longitude)
        ) {
          return location;
        }

        return {
          ...location,
          latitude: updated.latitude,
          longitude: updated.longitude,
        };
      }),
    );
  }

  // =====================================================
  // CLEAR SEARCH
  // =====================================================

  clearSearch(): void {
    this.searchTerm.set('');
  }

  // =====================================================
  // EXPLORE FROM MAP
  // =====================================================

  exploreLocation(location: MapLocation): void {
    this.router.navigate(['/locations', this.slugify(location.name)]);
  }

  // =====================================================
  // EXPLORE FROM CARD
  // =====================================================

  exploreByLocation(location: (typeof BARANGAYS)[number]): void {
    this.router.navigate(['/locations', location.slug]);
  }

  // =====================================================
  // SLUG
  // =====================================================

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  }
}
