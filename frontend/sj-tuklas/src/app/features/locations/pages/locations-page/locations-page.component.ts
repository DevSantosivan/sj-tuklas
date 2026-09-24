import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';

import {
  BusinessMapComponent,
  MapLocation,
} from '../../../../shared/components/business-map/business-map.component';

import { Business } from '../../../../core/models/business';
import { BUSINESSES } from '../../../../core/data/business.data';
import { BARANGAYS } from '../../../../core/data/barangay.data';

@Component({
  selector: 'app-locations-page',
  standalone: true,
  imports: [RouterLink, SearchBarComponent, BusinessMapComponent],
  templateUrl: './locations-page.component.html',
  styleUrl: './locations-page.component.scss',
})
export class LocationsPageComponent {
  // =====================================================
  // SEARCH
  // =====================================================

  searchTerm = signal('');

  // =====================================================
  // BARANGAYS
  // =====================================================

  locations = BARANGAYS;

  // =====================================================
  // MAP LOCATIONS
  // =====================================================

  mapLocations: MapLocation[] = BARANGAYS.map((barangay) => ({
    id: barangay.id,
    name: barangay.name,
    latitude: barangay.latitude,
    longitude: barangay.longitude,
    image: barangay.image,
  }));

  // =====================================================
  // BUSINESSES
  // =====================================================

  mapBusinesses: Business[] = BUSINESSES;

  // =====================================================
  // FILTERED LOCATIONS
  // =====================================================

  filteredLocations = computed(() => {
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

  filteredMapLocations = computed(() => {
    const filteredIds = new Set(
      this.filteredLocations().map((location) => location.id),
    );

    return this.mapLocations.filter((location) => filteredIds.has(location.id));
  });

  // =====================================================
  // SEARCH
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

  constructor(private router: Router) {}
}
